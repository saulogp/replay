# Replay 🔁

Treine trechos de músicas do YouTube em loop. Cole o link, marque início e fim
das partes que quer praticar, escolha quantas vezes repetir e a velocidade.

## Funcionalidades
- Biblioteca de músicas (qualquer formato de link do YouTube: watch, youtu.be, shorts, music…)
- Vários trechos por música, com nome, cor, início/fim (precisão de 0,1 s)
- Repetir 1×, 2×, 3×, 5×, 10×, quantidade personalizada ou ∞
- Velocidade por trecho (0,5× a 1,5×)
- Contagem regressiva global (liga/desliga, 1–8 s, com bip opcional) antes do trecho e entre repetições
- Marcação rápida "Marcar início → Marcar fim" enquanto o vídeo toca
- Linha do tempo com os trechos coloridos (toque para tocar / arraste para navegar)
- Tudo salvo no aparelho (localStorage) + backup/importação em JSON (da biblioteca toda ou de uma música só)
- Atalho no computador: **espaço** = tocar/pausar

## Rodar na web
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # gera dist/ para hospedar em qualquer site estático
```

## Gerar o APK Android
Requisitos: Android SDK em `~/Android/Sdk` e JDK 21 (usado `~/.local/jdk-21` por padrão;
sobrescreva com `JAVA_HOME`).
```bash
npm run android:apk   # gera ./Replay.apk
```
Para abrir no Android Studio: `npx cap open android`.

## Stack
React 19 + TypeScript + Vite · YouTube IFrame Player API · Capacitor 8 (Android)
