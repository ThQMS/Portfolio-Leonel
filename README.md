# Portfólio — Douglas Leonel

Portfólio pessoal de **Douglas Leonel** — QA / Software Tester Sênior, especializado em qualidade de software e testes automatizados (Robot Framework, Selenium, Playwright, Cypress) com formação em segurança defensiva e ethical hacking.

Interface com estética de IDE/terminal em **azul-noite, ciano e azul** (Blue Team), com tema **Wind Wall** inspirado no Yasuo (League of Legends): a muralha de vento que barra ameaças é a metáfora da defesa — encontrar o defeito antes que ele chegue ao usuário. Inclui globo 3D de ferramentas de QA, timeline de experiência em estilo `git log`, alternância de idioma PT/EN e efeitos ambientes (Wind Wall bloqueando ameaças, barra de testes e blueprint de arquitetura).

🌐 **Site:** https://thqms.github.io/Portfolio-Leonel/

🔗 **GitHub:** [@Leonelzin](https://github.com/Leonelzin) · **LinkedIn:** [Douglas Leonel](https://www.linkedin.com/in/douglas-leonel-482029209/)

## Tecnologias

- **HTML + CSS (Tailwind, build estático)** — layout, tokens de cor e utilitários
- **JavaScript (vanilla)** — máquina de escrever do terminal, scroll-reveal, navegação por teclado, alternância PT/EN, formulário
- **Three.js** (via CDN) — globo 3D interativo de ferramentas de QA (CSS3DRenderer + OrbitControls)
- **Lucide** — ícones da interface
- **Devicon** — ícones de tecnologias no globo
- **Geist / Geist Mono** — tipografia
- **mailto** — o formulário de contato abre o cliente de e-mail com a mensagem pronta (sem backend)

## Idiomas

O site é **PT-BR por padrão** com um botão **PT / EN** no canto superior esquerdo. A escolha fica salva no navegador e troca todos os textos na hora, sem recarregar.

## Estrutura

```
index.html            # página única
assets/
  css/                # estilos (tema, componentes, efeitos)
  js/                 # interações, globo 3D, efeitos, runtime de ícones
  fonts/              # fontes locais
```

## Rodando localmente

Como usa caminhos relativos e módulos ES, sirva por um servidor local (não abra via `file://`):

```bash
# Python
python -m http.server 8000
# depois acesse http://localhost:8000
```

## Deploy

Site estático, pronto para **GitHub Pages** (ou qualquer host estático). Com o repositório publicado, basta ativar o Pages apontando para a branch principal / raiz.

---

© 2026 Douglas Leonel. Todos os direitos reservados.
