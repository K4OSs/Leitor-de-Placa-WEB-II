const apiUrl = window.location.hostname === 'localhost'
  ? 'http://localhost:3000' // Para desenvolvimento local
  : 'https://leitor-de-placa-web-ii.onrender.com'; // URL de produção

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const tokenKey = 'minhaChaveSecreta01'; // Chave para armazenar o token no localStorage
  const novoCadastroLink = document.getElementById('novo-cadastro-link');
  const loginSection = document.getElementById('login-section');
  const LoginLink = document.getElementById('login-link');
  const CadastroSection = document.getElementById('cadastro-section');

  // Exibir formulário de cadastro de usuário ao pressionar "Novo Cadastro"
  if (novoCadastroLink) {
    novoCadastroLink.addEventListener('click', () => {
      CadastroSection.style.display = 'block'; // Mostra o formulário
      loginSection.style.display = 'none'; // Esconde a sessão de login
    });
  }

  if (LoginLink) {
    LoginLink.addEventListener('click', () => {
      CadastroSection.style.display = 'none'; // Esconde a sessão de cadastro
      loginSection.style.display = 'block'; // Revela a sessão de login
    });
  }

  // Função de login
  if (loginForm) {
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
          //loginSection.style.display = 'none'; // Oculta o formulário de login
          //wrapperSection.style.display = 'none' //Oculta a seção de login e/ou cadastro
          //actionsSection.style.display = 'block'; // Mostra as ações após login
        
          alert('Login realizado com sucesso!'); 
          window.location.href = 'actions.html';
        } else {
          loginError.textContent = data.message || 'Erro ao fazer login';
        }
      } catch (error) {
        loginError.textContent = 'Erro na requisição';
      }
    });
  }

  // Configuração do vídeo tutorial na página actions.html
  const videoElement = document.getElementById('tutorialVideo');
  if (videoElement) {
    //console.log("Configuring video tutorial...");
    const videoSource = videoElement.querySelector('source');
    
    if (videoSource) {
      videoSource.src = `${apiUrl}/videoTutorial`; // Definir a rota do vídeo
      videoElement.load(); // Carregar o vídeo
      console.log("Video tutorial loaded:", videoSource.src);
    } else {
      console.error("Video source element not found.");
    }
  } else {
    console.error("Video element not found on the page.");
  }

  // Função para obter o token armazenado
  function getAuthToken() {
    return localStorage.getItem(tokenKey);
  }

  //Função para cadastrar um novo usuário
  const cadastroUsuarioForm = document.getElementById('cadastroUsuarioForm');
  if (cadastroUsuarioForm) {
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
  }

  // Função para cadastro de placa
  const cadastroPlacaForm = document.getElementById('cadastroPlacaForm');
  if (cadastroPlacaForm) {
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
        document.getElementById('mensagem-erro-cadastro-placa').innerText = 'Erro ao enviar a imagem.';
      }
    });
  }
  
  // Função para consulta de placa
  const consultaPlacaForm = document.getElementById('consultaPlacaForm');
  if (consultaPlacaForm) {
    document.getElementById('consultaPlacaForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const placa = document.getElementById('placa').value;
      const infoPlaca = document.getElementById('info-placa');
      const mensagemErro = document.getElementById('mensagem-consulta-placa');
    
      try {
        const resultado = await protectedRequest(`${apiUrl}/consulta/${placa}`, 'GET');
        
        // Formatar o resultado para uma exibição mais organizada
        if (Array.isArray(resultado) && resultado.length > 0) {
          const placaArray = resultado[0]; // Considera o primeiro item do array como o resultado
          
          const formattedResult = `
            <h3>Informações da Placa:</h3>
            <p><strong>Número da Placa:</strong> ${placaArray.numero}</p>
            <p><strong>Cidade:</strong> ${placaArray.cidade}</p>
            <p><strong>Data e Hora:</strong> ${new Date(placaArray.dataHora).toLocaleString()}</p>
          `;
    
          infoPlaca.innerHTML = formattedResult;
          infoPlaca.style.display = 'block';
          mensagemErro.style.display = 'none';

        } else {
          mensagemErro.innerText = 'Placa não encontrada.';
          mensagemErro.style.display = 'block';
          infoPlaca.style.display = 'none';
        }
      } catch (error) {
        //console.error('Erro ao consultar a placa:', error);
        mensagemErro.innerText = 'Erro ao consultar a placa.';
        mensagemErro.style.display = 'block';
        infoPlaca.style.display = 'none';
      }
    });
  }

  // Função para gerar relatório por cidade
  const relatorioCidadeForm = document.getElementById('relatorioCidadeForm');
  if (relatorioCidadeForm) {
    document.getElementById('relatorioCidadeForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const cidade = document.getElementById('cidade').value;
      const mensagem = document.getElementById('mensagem-relatorio');
    
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
        mensagem.innerText = 'Erro ao gerar o relatório.';
      }
    });
  }
  
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
