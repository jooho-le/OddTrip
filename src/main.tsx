import React from 'react';
import ReactDOM from 'react-dom/client';
// CSS 먼저 평가되도록 App 위에 둡니다.
// (App → IntroLandingPage → intro.css 순으로 이어져 인트로 CSS가 마지막에 주입 = 원본 HTML의 style 블록 순서)
import './styles/globals.css';
import './styles/prototype-app.css';
import { App } from './app/App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
