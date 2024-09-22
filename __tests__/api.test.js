const request = require('supertest');
const app = require('../api/api.js'); // O arquivo principal do servidor

describe('Testes das Rotas', () => {

  let token;

  // Teste para o login
  it('POST /login - deve fazer login com sucesso', async () => {
    const response = await request(app)
      .post('/login')
      .send({
        email: 'usuario@example.com',
        senha: 'senhaSegura123',
      });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('token');
    
    // Armazena o token para os próximos testes
    token = response.body.token;
  });

  // Teste para o cadastro de placas
  it('POST /cadastroPlaca - deve cadastrar uma placa com sucesso', async () => {
    const response = await request(app)
      .post('/cadastroPlaca')
      .set('Authorization', `Bearer ${token}`)
      .attach('imagem', '__tests__/placa-carro.jpg') // Adiciona uma imagem de exemplo
      .expect(201);

    expect(response.text).toBe('Placa cadastrada com sucesso.');
  });

  // Teste para consulta de placa cadastrada
  it('GET /consulta/:placa - deve retornar informações da placa cadastrada', async () => {
    const response = await request(app)
      .get('/consulta/FXR9915')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  
    // Verifica se a resposta contém um array e se tem pelo menos um item
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  
    // Verifica se o primeiro item do array tem a propriedade 'numero' com o valor esperado
    const placaInfo = response.body[0]; // Pega o primeiro objeto do array
    expect(placaInfo).toHaveProperty('numero', 'FXR9915');
  });
  

  // Teste para a geração do relatório PDF
  it('GET /relatorio/:cidade - deve retornar o relatório em PDF', async () => {
    const response = await request(app)
      .get('/relatorio/Limeira')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.headers['content-type']).toBe('application/pdf');
    expect(response.body).toBeInstanceOf(Buffer); // Verifica se a resposta é um Buffer (PDF)
  });

  // Teste para falha de autenticação ao consultar placa sem token
  it('GET /consulta/:placa - deve falhar ao tentar acessar sem token', async () => {
    const response = await request(app)
      .get('/consulta/FXR9915')
      .expect(401);

    expect(response.body).toHaveProperty('mensagem', 'Token não foi enviado.');
  });
});

