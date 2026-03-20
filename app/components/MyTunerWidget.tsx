'use client'

import { useEffect, useRef } from "react"

const WIDGET_ID = "delta-fm-player-inline"

const DELTA_FM_WIDGET_HTML = `
<div id="${WIDGET_ID}" class="mytuner-widget" data-target="450623" data-requires_initialization="true" data-autoplay="false" data-hidehistory="true" style="width: 100%; max-width: 100%; overflow: hidden; border-radius: 18px;">
  <style type="text/css">
    .mytuner-widget { all: initial; display: block; color: #1e3a8a; }
    .mytuner-widget, .mytuner-widget * { box-sizing: border-box; font-family: sans-serif; }
    .mytuner-widget img,
    .mytuner-widget .player-mytuner-logo,
    .mytuner-widget .volume-controls,
    .mytuner-widget #${WIDGET_ID}song-history { display: none !important; }
    .mytuner-widget #${WIDGET_ID}top-bar {
      background: rgba(255,255,255,0.96) !important;
      height: auto !important;
      min-height: 82px;
      padding: 14px 18px !important;
      display: flex !important;
      align-items: center;
      gap: 14px;
      border-radius: 18px;
      line-height: normal !important;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
    }
    .mytuner-widget .main-play-button {
      float: none !important;
      margin: 0 !important;
      width: 52px;
      height: 52px;
      border-radius: 999px;
      background: #2563eb;
      box-shadow: none;
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .mytuner-widget .main-play-button:hover { background: #1d4ed8; }
    .mytuner-widget .main-play-button.disabled { filter: none; cursor: pointer; opacity: 1; }
    .mytuner-widget .main-play-button div {
      width: 24px;
      height: 24px;
      margin: 0;
      background: url("https://mytuner-radio.com/static/icons/widgets/BT_Play/BT_Play@2x.png") no-repeat center;
      background-size: 18px;
      filter: brightness(0) invert(1);
    }
    .mytuner-widget .main-play-button.playing div {
      background: url("https://mytuner-radio.com/static/icons/widgets/BT_Pause/BT_Pause@2x.png") no-repeat center;
      background-size: 18px;
      filter: brightness(0) invert(1);
    }
    .mytuner-widget .main-play-button.loading div {
      background: url("https://static2.mytuner.mobi/static/images/sprite-loading.gif") no-repeat center;
      background-size: 26px;
      filter: brightness(0) invert(1);
    }
    .mytuner-widget .main-play-button.error div {
      background: url("https://mytuner-radio.com/static/icons/widgets/BT_Error/erro@2x.png") no-repeat center;
      background-size: 18px;
      filter: brightness(0) invert(1);
    }
    .mytuner-widget .player-radio-link {
      width: auto !important;
      height: auto !important;
      display: block !important;
      line-height: normal !important;
      text-decoration: none;
      min-width: 0;
      flex: 1 1 auto;
      pointer-events: none;
    }
    .mytuner-widget .player-radio-name {
      width: auto !important;
      margin: 0 !important;
      float: none !important;
      white-space: normal !important;
      overflow: visible !important;
      text-overflow: initial !important;
      color: #2563eb !important;
      font-size: 18px !important;
      font-weight: 700 !important;
      display: block;
    }
    .mytuner-widget .player-radio-link::after {
      content: "Delta FM 88.3";
      display: block;
      margin-top: 4px;
      color: #475569;
      font-size: 13px;
      font-weight: 500;
    }
  </style>
  <div id="${WIDGET_ID}top-bar">
    <div id="${WIDGET_ID}play-button" class="main-play-button disabled" data-id="${WIDGET_ID}">
      <div class="play-image"></div>
    </div>
    <a class="player-radio-link" href="https://mytuner-radio.com/radio/delta-fm-uruguay-450623/?utm_source=widget&utm_medium=player" rel="noopener" target="_blank">
      <span class="player-radio-name">Reproducir radio</span>
    </a>
    <div class="volume-controls"></div>
  </div>
  <ul id="${WIDGET_ID}song-history" data-border="0" data-bordercolor="transparent"></ul>
</div>
`

export function MyTunerWidget() {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.innerHTML = DELTA_FM_WIDGET_HTML

    const scriptUrls = [
      "https://mytuner-radio.com/static/js/widgets/player-v1.js",
      "https://mytuner-radio.com/static/js/widgets/widget-player-v1.js",
    ]

    const appendedScripts = scriptUrls.map((src) => {
      const script = document.createElement("script")
      script.src = src
      script.async = true
      document.body.appendChild(script)
      return script
    })

    const initInterval = window.setInterval(() => {
      const scripts = window as Window & {
        mytuner_scripts?: Record<string, unknown>
      }

      if (typeof scripts.mytuner_scripts?.["player-v1.js"] === "function") {
        ;(scripts.mytuner_scripts["player-v1.js"] as (id: string) => void)(WIDGET_ID)
        window.clearInterval(initInterval)
      }
    }, 800)

    return () => {
      window.clearInterval(initInterval)
      appendedScripts.forEach((script) => script.remove())
      container.innerHTML = ""
    }
  }, [])

  return <div ref={containerRef} className="w-full" />
}
