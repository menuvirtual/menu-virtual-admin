import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Autenticacao } from '../../core/autenticacao';
import { mensagemDeErro } from '../../core/interceptor-erros';
import { RestauranteAtual } from '../../core/restaurante-atual';
import { Captcha } from '../../shared/captcha';
import { invalido } from '../../shared/formularios';

type Etapa = 'entrar' | 'nova-senha' | 'esqueci' | 'redefinir';

/** Mesma política do user pool do Cognito */
const SENHA_FORTE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

/**
 * Tela de login (estilo do Inspinia): usuário, senha e captcha. Também cobre o
 * primeiro acesso (trocar a senha temporária) e o "esqueci minha senha"
 * (código enviado por e-mail).
 */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, NgTemplateOutlet, Captcha],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(Autenticacao);
  private readonly restauranteAtual = inject(RestauranteAtual);
  private readonly router = inject(Router);
  private readonly consulta = toSignal(inject(ActivatedRoute).queryParamMap);
  private readonly captcha = viewChild(Captcha);

  protected readonly urlCaptcha = this.auth.urlCaptcha;
  protected readonly ano = new Date().getFullYear();
  protected readonly etapa = signal<Etapa>('entrar');
  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);
  protected readonly respostaCaptcha = signal<string | null>(null);
  protected readonly captchaPendente = signal(false);
  protected readonly invalido = invalido;
  /** Sessão do desafio de nova senha (primeiro acesso) */
  private desafio = '';

  protected readonly formEntrar = new FormGroup({
    usuario: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    senha: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  protected readonly formNovaSenha = new FormGroup({
    novaSenha: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(SENHA_FORTE)],
    }),
    confirmacao: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  protected readonly formCodigo = new FormGroup({
    codigo: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor() {
    if (this.auth.logado()) void this.router.navigate(['/']);
    if (this.consulta()?.get('motivo') === 'expirada')
      this.aviso.set('Sua sessão expirou. Entre de novo.');
  }

  protected irPara(etapa: Etapa): void {
    this.etapa.set(etapa);
    this.erro.set(null);
    this.respostaCaptcha.set(null);
    this.captchaPendente.set(false);
    this.formNovaSenha.reset();
    this.formCodigo.reset();
  }

  protected async entrar(): Promise<void> {
    if (!this.validar(this.formEntrar, true)) return;
    const { usuario, senha } = this.formEntrar.getRawValue();
    await this.executar(async () => {
      const resultado = await this.auth.entrar(usuario.trim(), senha, this.respostaCaptcha()!);
      if (resultado.tipo === 'nova-senha') {
        this.desafio = resultado.desafio;
        this.irPara('nova-senha');
        this.aviso.set('Primeiro acesso: defina a sua senha.');
        return;
      }
      await this.concluirLogin();
    });
  }

  protected async definirNovaSenha(): Promise<void> {
    if (!this.validar(this.formNovaSenha, false) || !this.senhasIguais()) return;
    await this.executar(async () => {
      await this.auth.definirNovaSenha(
        this.formEntrar.controls.usuario.value.trim(),
        this.desafio,
        this.formNovaSenha.controls.novaSenha.value,
      );
      await this.concluirLogin();
    });
  }

  protected async pedirCodigo(): Promise<void> {
    if (!this.validar(this.formEntrar.controls.usuario, true)) return;
    await this.executar(async () => {
      await this.auth.esqueciSenha(
        this.formEntrar.controls.usuario.value.trim(),
        this.respostaCaptcha()!,
      );
      this.irPara('redefinir');
      this.aviso.set(
        'Se o usuário existir, enviamos um código para o e-mail cadastrado. Ele vale por alguns minutos.',
      );
    });
  }

  protected async redefinirSenha(): Promise<void> {
    const formsValidos =
      this.validar(this.formCodigo, false) && this.validar(this.formNovaSenha, false);
    if (!formsValidos || !this.senhasIguais()) return;
    await this.executar(async () => {
      await this.auth.redefinirSenha(
        this.formEntrar.controls.usuario.value.trim(),
        this.formCodigo.controls.codigo.value.trim(),
        this.formNovaSenha.controls.novaSenha.value,
      );
      this.formEntrar.controls.senha.reset();
      this.irPara('entrar');
      this.aviso.set('Senha alterada. Entre com a nova senha.');
    });
  }

  protected senhasIguais(): boolean {
    const { novaSenha, confirmacao } = this.formNovaSenha.getRawValue();
    return !confirmacao || novaSenha === confirmacao;
  }

  /** Marca os campos e confere o captcha (quando a etapa exige). */
  private validar(controle: FormGroup | FormControl, exigeCaptcha: boolean): boolean {
    controle.markAllAsTouched();
    this.captchaPendente.set(exigeCaptcha && !this.respostaCaptcha());
    return controle.valid && !this.captchaPendente();
  }

  private async executar(acao: () => Promise<void>): Promise<void> {
    this.enviando.set(true);
    this.erro.set(null);
    this.aviso.set(null);
    try {
      await acao();
    } catch (erro) {
      this.erro.set(mensagemDeErro(erro));
      // a resposta do captcha só vale uma vez: nova tentativa, novo captcha
      this.captcha()?.reiniciar();
    } finally {
      this.enviando.set(false);
    }
  }

  private async concluirLogin(): Promise<void> {
    await this.auth.carregarPerfil();
    // quem administra vários restaurantes escolhe a cada login (com um só, entra direto nele)
    this.restauranteAtual.limpar();
    const retorno = this.consulta()?.get('retorno');
    await this.router.navigateByUrl(retorno?.startsWith('/') ? retorno : '/');
  }
}
