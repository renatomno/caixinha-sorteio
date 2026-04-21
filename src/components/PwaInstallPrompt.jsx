function PwaInstallPrompt({ canInstall, onDismiss, onInstall, showIosInstallHint }) {
  if (!canInstall && !showIosInstallHint) {
    return null
  }

  return (
    <aside className="install-callout" aria-live="polite">
      <div className="install-copy">
        <span className="status-pill install-pill">App no celular</span>
        <strong>{canInstall ? 'Instale a caixinha em um toque' : 'Use a caixinha como app'}</strong>
        <p>
          {canInstall
            ? 'Adicione na tela inicial para abrir mais rapido, em tela cheia, como se fosse um app.'
            : 'No iPhone ou iPad, abra o menu Compartilhar do navegador e toque em Adicionar a Tela de Inicio.'}
        </p>

        {showIosInstallHint ? (
          <ol className="install-steps">
            <li>Abra o menu Compartilhar.</li>
            <li>Toque em Adicionar a Tela de Inicio.</li>
            <li>Confirme em Adicionar.</li>
          </ol>
        ) : null}
      </div>

      <div className="install-actions">
        {canInstall ? (
          <button type="button" className="draw-button install-primary" onClick={onInstall}>
            Instalar app
          </button>
        ) : null}

        <button type="button" className="ghost-button install-close" onClick={onDismiss}>
          Agora nao
        </button>
      </div>
    </aside>
  )
}

export default PwaInstallPrompt
