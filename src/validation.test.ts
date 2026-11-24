import { describe, expect, it } from 'vitest';
import {
  digitosWhatsapp,
  mascararWhatsapp,
  normalizarEmail,
  normalizarNome,
  sugerirEmail,
  validar,
  validarEmail,
  validarNome,
  validarWhatsapp,
} from './validation';

describe('WhatsApp', () => {
  it.each([
    ['+55 11 98765-4321', '11987654321'],
    ['+5511987654321', '11987654321'],
    ['5511987654321', '11987654321'],
    ['(11) 98765-4321', '11987654321'],
    ['011 98765-4321', '11987654321'],
    ['55 3221-1234', '5532211234'], // DDD 55 (RS) sem código do país
    ['+55 55 99999-1234', '55999991234'],
    ['555532211234', '5532211234'],
  ])('extrai dígitos de %s', (entrada, esperado) => {
    expect(digitosWhatsapp(entrada)).toBe(esperado);
  });

  it('aplica máscara progressiva', () => {
    expect(mascararWhatsapp('1')).toBe('(1');
    expect(mascararWhatsapp('11')).toBe('(11');
    expect(mascararWhatsapp('119')).toBe('(11) 9');
    expect(mascararWhatsapp('1198765')).toBe('(11) 9876-5');
    expect(mascararWhatsapp('1132211234')).toBe('(11) 3221-1234');
    expect(mascararWhatsapp('11987654321')).toBe('(11) 98765-4321');
    expect(mascararWhatsapp('+55 11 98765-4321')).toBe('(11) 98765-4321');
  });

  it('valida', () => {
    expect(validarWhatsapp('(11) 98765-4321')).toBeUndefined();
    expect(validarWhatsapp('(11) 3221-1234')).toBeUndefined();
    expect(validarWhatsapp('')).toMatch(/Informe/);
    expect(validarWhatsapp('(11) 9876')).toMatch(/Confira/);
    expect(validarWhatsapp('(10) 98765-4321')).toMatch(/Confira/);
    expect(validarWhatsapp('(21) 88765-4321')).toMatch(/Confira/);
  });
});

describe('Nome', () => {
  it('normaliza espaços', () => {
    expect(normalizarNome('  Maria   da  Silva ')).toBe('Maria da Silva');
  });
  it('valida', () => {
    expect(validarNome("João D'Ávila")).toBeUndefined();
    expect(validarNome('Ana-Clara Souza')).toBeUndefined();
    expect(validarNome('')).toMatch(/Informe seu nome/);
    expect(validarNome('Maria')).toMatch(/sobrenome/);
    expect(validarNome('Maria 123')).toMatch(/letras/);
  });
});

describe('E-mail', () => {
  it('normaliza', () => {
    expect(normalizarEmail('  Maria.Silva@Gmail.COM ')).toBe('maria.silva@gmail.com');
  });
  it('valida', () => {
    expect(validarEmail('Maria@Gmail.com')).toBeUndefined();
    expect(validarEmail('a.b+c@empresa.com.br')).toBeUndefined();
    expect(validarEmail('')).toMatch(/Informe/);
    expect(validarEmail('maria@')).toMatch(/Confira/);
    expect(validarEmail('maria@gmail')).toMatch(/Confira/);
  });
  it('sugere correção de domínio', () => {
    expect(sugerirEmail('ana@gmail.con')).toBe('ana@gmail.com');
    expect(sugerirEmail('ana@hotmal.com')).toBe('ana@hotmail.com');
    expect(sugerirEmail('ana@gmail.com')).toBeUndefined();
  });
});

it('validar() junta todos os erros', () => {
  expect(Object.keys(validar({ nome: '', whatsapp: '', email: '' }))).toEqual(['nome', 'whatsapp', 'email']);
  expect(validar({ nome: 'Ana Souza', whatsapp: '11987654321', email: 'ana@x.com' })).toEqual({});
});
