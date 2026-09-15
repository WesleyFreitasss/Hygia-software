import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

/*
 * Montserrat servida pela propria aplicacao, e nao pelo Google Fonts.
 * Cada import traz um peso; o Vite empacota os .woff2 junto com o build, entao
 * a fonte nao depende de rede externa nem de o Google estar acessivel.
 * Para usar um peso novo (ex.: 300 para textos leves), basta adicionar a linha.
 */
import '@fontsource/montserrat/400.css'; // regular - corpo de texto
import '@fontsource/montserrat/500.css'; // medium  - rotulos de formulario
import '@fontsource/montserrat/600.css'; // semibold - titulos de secao
import '@fontsource/montserrat/700.css'; // bold    - botoes e destaques

// O CSS global entra ANTES dos componentes para que o Tailwind (e o reset dele)
// seja carregado primeiro, e o estilo de cada tela venha por cima.
import './styles/global.css';
import Login from './login.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Login />
  </StrictMode>,
);
