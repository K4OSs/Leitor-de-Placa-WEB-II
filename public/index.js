const apiUrl = process.env.FRONTEND_URL;

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const actionsSection = document.getElementById('actions-section');
  const tokenKey = 'minhaChaveSecreta01'; // Chave para armazenar o token no localStorage

  // Login form submission
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;

    try {
      const response = await fetch(`${apiUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha: senha })
      });

      const data = await response.json();
      //console.log('Resposta:', data);

      if (response.ok) {
        // Armazenar o token JWT no localStorage
        localStorage.setItem(tokenKey, data.token);

        loginError.textContent = '';
        loginForm.style.display = 'none'; // Oculta o formulário de login
        actionsSection.style.display = 'block'; // Mostra as ações após login
        alert('Login realizado com sucesso!');
      } else {
        loginError.textContent = data.message || 'Erro ao fazer login';
      }
    } catch (error) {
      loginError.textContent = 'Erro na requisição';
    }
  });

  // Função para obter o token armazenado
  function getAuthToken() {
    return localStorage.getItem(tokenKey);
  }

  //Função para cadastrar um novo usuário
  document.getElementById('cadastroUsuarioForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = document.getElementById('cadastro-nome').value;
    const email = document.getElementById('cadastro-email').value;
    const senha = document.getElementById('cadastro-senha').value;    

    // Enviar os dados para a rota /cadastrarUsuario
    try {
      const response = await fetch(`${apiUrl}/cadastrarUsuario`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome,
          email,
          senha
        })
      });

      //console.log('Enviando dados:', { nome, email, senha });

      const result = await response.json();
      //console.log('Resposta:', result);

      if (response.ok) {
        document.getElementById('mensagem').textContent = 'Usuário cadastrado com sucesso!';
        // Exibir alerta de sucesso
        alert('Usuário cadastrado com sucesso!');
      } else {
        document.getElementById('mensagem').textContent = `Erro: ${result.message}`;
        // Exibir alerta com mensagem de erro
        alert(`Erro: ${result.message}`);
      }
    } catch (error) {
      document.getElementById('mensagem').textContent = 'Ocorreu um erro ao cadastrar o usuário.';
      // Exibir alerta de erro genérico
      alert('Ocorreu um erro ao cadastrar o usuário.');
    }
  });

  // Função para cadastro de placa
  document.getElementById('cadastroPlacaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
  
    const formData = new FormData();
    const imagem = document.getElementById('imagem').files[0];
  
    if (!imagem) {
      alert("Por favor, selecione uma imagem.");
      return;
    }
  
    formData.append('imagem', imagem);
  
    try {
      const resultado = await protectedRequest(`${apiUrl}/cadastroPlaca`, {
        method: 'POST',
        body: formData,
      });
  
      document.getElementById('mensagem-cadastro-placa').innerText = resultado; // Agora o resultado pode ser texto
      alert(resultado);
    } catch (error) {
      //console.error('Erro ao enviar imagem:', error);
      document.getElementById('mensagem-cadastro-placa').innerText = 'Erro ao enviar a imagem.';
    }
  });
  
  // Função para consulta de placa
  document.getElementById('consultaPlacaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const placa = document.getElementById('placa').value;
  
    try {
      const resultado = await protectedRequest(`${apiUrl}/consulta/${placa}`, 'GET');
      
      // Formatar o resultado para uma exibição mais organizada
      if (Array.isArray(resultado) && resultado.length > 0) {
        const placaInfo = resultado[0]; // Considera o primeiro item do array como o resultado
        
        const formattedResult = `
          <h3>Informações da Placa:</h3>
          <p><strong>Número da Placa:</strong> ${placaInfo.numero}</p>
          <p><strong>Cidade:</strong> ${placaInfo.cidade}</p>
          <p><strong>Data e Hora:</strong> ${new Date(placaInfo.dataHora).toLocaleString()}</p>
        `;
  
        document.getElementById('mensagem-consulta-placa').innerHTML = formattedResult;
      } else {
        document.getElementById('mensagem-consulta-placa').innerText = 'Placa não encontrada.';
      }
    } catch (error) {
      //console.error('Erro ao consultar a placa:', error);
      document.getElementById('mensagem-consulta-placa').innerText = 'Erro ao consultar a placa.';
    }
  });
  

  // Função para gerar relatório por cidade
  document.getElementById('relatorioCidadeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const cidade = document.getElementById('cidade').value;
  
    try {
      // Faça a requisição para obter o PDF como Blob
      const blob = await protectedRequest(`${apiUrl}/relatorio/${cidade}`, {
        method: 'GET',
        responseType: 'blob', // Adicionando corretamente o responseType
      });
  
      // O conteúdo será um blob (PDF)
      const url = window.URL.createObjectURL(blob);
  
      // Inserir link para baixar o relatório
      document.getElementById('pdfDownload').innerHTML = `<a href="${url}" download="relatorio_${cidade}.pdf">Baixar Relatório</a>`;
      
    } catch (error) {
      //console.error('Erro ao gerar o relatório:', error);
      document.getElementById('mensagem-pdf').innerText = 'Erro ao gerar o relatório.';
    }
  });
  

  async function protectedRequest(url, options = {}) {
    const token = getAuthToken();
    const headers = options.headers || {};
  
    // Adicionar o token de autorização
    headers['Authorization'] = `Bearer ${token}`;
  
    // Se for FormData, não adicionar 'Content-Type', o navegador faz isso automaticamente
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
  
    const fetchOptions = {
      method: options.method || 'GET',
      headers,
      body: options.body instanceof FormData ? options.body : JSON.stringify(options.body),
    };
  
    const response = await fetch(url, fetchOptions);
    
    if (response.status === 401) {
      alert('Sua sessão expirou, faça login novamente.');
      window.location.reload(); // Redireciona para o login
    } else if (!response.ok) {
      const message = await response.text();
      throw new Error(message);
    }
  
    // Verifique o tipo de resposta antes de convertê-la
    const contentType = response.headers.get('Content-Type');

    if (contentType && contentType.includes('application/json')) {
      return response.json();  // Converte para JSON se o tipo for JSON
    } else if (options.responseType === 'blob') {
      return response.blob();  // Retorna um Blob para PDFs ou outros arquivos
    } else {
      return response.text();  // Retorna texto simples (string) para outros casos
    }
  }

});
