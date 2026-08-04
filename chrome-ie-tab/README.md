# Chrome IE Tab

Extensão para **Google Chrome** no estilo [IE Tab](https://www.ietab.net/): abre páginas no motor **Internet Explorer (Trident)** em uma janela separada, útil para sistemas legados de intranet.

> **Importante:** o Chrome sozinho não consegue embutir o IE. No Windows, esta solução usa um **host nativo** com o controle `WebBrowser` (Trident/IE11). Em macOS/Linux o motor IE não existe.

## O que está incluso

| Pasta | Conteúdo |
| --- | --- |
| `extension/` | Extensão Chrome (Manifest V3) |
| `native-host/` | Host Windows + instalador PowerShell |

### Recursos

- Botão na barra de ferramentas para abrir a aba atual no IE
- Atalho `Alt+Shift+I`
- Menu de contexto “Abrir no Internet Explorer”
- Lista automática de domínios/URLs (como o IE Tab)
- Visualizador com barra de endereço, voltar, avançar e atualizar
- Instalação do host sem admin (`HKCU`)

## Instalação (Windows)

### 1. Carregar a extensão

1. Abra `chrome://extensions`
2. Ative **Modo do desenvolvedor**
3. Clique em **Carregar sem compactação** e selecione a pasta `extension/`
4. Copie o **ID** da extensão

### 2. Instalar o host nativo

Abra o **PowerShell** na pasta `native-host/`:

```powershell
.\install.ps1 -ExtensionId COLE_O_ID_AQUI
```

Reinicie o Chrome e teste o botão **Abrir no IE**.

Para remover:

```powershell
.\install.ps1 -Uninstall
```

### Requisitos do host

- Windows 10/11
- .NET Framework 4.x (`csc.exe` em `Framework64\v4.0.30319`)
- Recurso de Internet Explorer / modo de compatibilidade disponível no sistema (controle `WebBrowser`)

## Uso

1. Navegue até o sistema legado no Chrome
2. Clique no ícone **Chrome IE Tab** → **Abrir no IE**
3. (Opcional) Adicione o domínio à **lista automática** nas opções

Padrões aceitos na lista:

```
intranet.empresa.local
*.empresa.local
https://erp.empresa.local/legado/*
```

## Segurança

O motor Trident/IE **não recebe mais patches de segurança**. Use apenas com sites internos confiáveis. Para muitos cenários corporativos, o [IE Mode do Microsoft Edge](https://learn.microsoft.com/edge/web-platform/ie-mode) é a opção oficial suportada pela Microsoft.

## Limitações

- Não funciona no macOS/Linux (não há Trident)
- Não é um clone pixel-perfect do IE Tab comercial (sem proxy remoto de IE)
- ActiveX depende do que o `WebBrowser` do Windows ainda permitir no seu ambiente
- Extensão em modo desenvolvedor; publicação na Chrome Web Store exigiria revisão e política de Native Messaging

## Estrutura técnica

```
Chrome (extension)
  └─ chrome.runtime.sendNativeMessage
       └─ ChromeIETabHost.exe  (modo Native Messaging)
            └─ inicia ChromeIETabHost.exe --viewer <url>
                 └─ WinForms + WebBrowser (Trident)
```

## Licença

Uso livre neste repositório. “IE Tab” é marca de terceiros; este projeto é uma implementação independente com propósito semelhante.
