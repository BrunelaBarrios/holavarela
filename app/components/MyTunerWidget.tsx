'use client'

import { ExternalLink, Radio } from "lucide-react"
import { useEffect, useMemo, useRef } from "react"

const WIDGET_ID = "w7rDm8OtOMOPw6rDjUrDr0cuLsO1w6rDrsOnw77DrMOQwrjDgQ=="
const DEFAULT_TUNER_URL =
  "https://mytuner-radio.com/radio/delta-fm-uruguay-450623/?utm_source=widget&utm_medium=player"

type MyTunerWidgetProps = {
  streamUrl: string
  title: string
}

const isDirectAudioStream = (url: string) =>
  /\.(mp3|aac|m3u8|ogg|opus)(\?.*)?$/i.test(url) ||
  /stream|listen|live/i.test(url)

const buildWidgetHtml = (streamUrl: string) => `
<div id="${WIDGET_ID}" class="mytuner-widget" data-target="450623" data-requires_initialization="true" data-autoplay="false" data-hidehistory="false" style="width: 100%; max-width: 100%; overflow: hidden; max-height: 450px; border: 1px solid rgb(129, 127, 128); border-radius: 6px;">
  <style type="text/css">
    .mytuner-widget { all: initial; display: block; color: #3D3D3D; }
    .mytuner-widget, .mytuner-widget * { box-sizing: border-box; font-family: sans-serif; }
    .main-play-button { padding: 5px; border-radius: 20px; width: 40px; height: 40px; float: left; margin-left: 10px; margin-right: 15px; margin-top: 12.5px; cursor: pointer; background-color: #FFF; box-shadow: 1px 2px 6px -3px black; display: inline-block; }
    .main-play-button:hover { background-color: #EEE; }
    .main-play-button.disabled { filter: grayscale(1); cursor: not-allowed; }
    .mytuner-widget .main-play-button div {
      background: url("https://mytuner-radio.com/static/icons/widgets/BT_Play/BT_Play@2x.png") no-repeat center;
      background-size: 16px;
      width: 28px;
      height: 28px;
      margin-left: 3px;
    }
    .mytuner-widget .main-play-button.playing div {
      background: url("https://mytuner-radio.com/static/icons/widgets/BT_Pause/BT_Pause@2x.png") no-repeat center;
      background-size: 16px;
      margin-left: 2px;
    }
    .mytuner-widget .main-play-button.loading div {
      background: url("https://static2.mytuner.mobi/static/images/sprite-loading.gif") no-repeat center;
      background-size: 26px;
      filter: grayscale(1);
      margin-left: 2px;
    }
    .mytuner-widget .main-play-button.error div {
      background: url("https://mytuner-radio.com/static/icons/widgets/BT_Error/erro@2x.png") no-repeat center;
      background-size: 16px;
      margin-left: 0;
    }
    .play-button { background: url("https://mytuner-radio.com/static/icons/widgets/BT_Play/BT_Play.png") no-repeat center; width: 40px; height: 40px; cursor: pointer; display: inline-flex; align-items: center; margin: auto 4px auto 19px; }
    .play-button.loading { background: url("https://static2.mytuner.mobi/static/images/sprite-loading.gif") no-repeat center; filter: grayscale(1); background-size: 28px; }
    .play-button.playing { background: url("https://mytuner-radio.com/static/icons/widgets/BT_Pause/BT_Pause.png") no-repeat center; }
    .play-button.error { background: url("https://mytuner-radio.com/static/icons/widgets/BT_Error/erro.png") no-repeat center; background-size: 15px; }
    .play-button.disabled { opacity: 0.3; }
    .play-button.disabled:hover { cursor: not-allowed; }
    input[type=range][orient=vertical] { writing-mode: bt-lr; -webkit-appearance: slider-vertical; width: 8px; padding: 0 5px; }
    .volume-controls { width: 35px; height: 35px; display: inline-block; position: absolute; margin-left: 5px; margin-top: 14px; padding-top: 0; border-radius: 20px; box-sizing: content-box !important; z-index: 10; border: 1px solid transparent; transition: background 0.5s, padding 0.5s, margin 0.5s, border 0.5s; overflow: hidden; }
    .volume-controls:hover { padding-top: 140px; margin-top: -126px; background-color: #F2F2F2; border: 1px solid grey; transition: background 0.5s, padding 0.5s, margin 0.5s; }
    .volume-controls:hover > .volume-control { display: block; }
    .volume-controls .volume-control { opacity: 0; margin-top: -126px; margin-left: 13px; position: absolute; transition: 0.5s all; }
    .volume-controls:hover .volume-control { opacity: 1; }
    .volume-controls .volume-indicator { cursor: pointer; display: block; }
    .player-radio-link { width: calc(100% - 65px - 84px - 37px - 12px); }
    .player-radio-name { width: calc(100% - 74px - 10px); }
    .player-mytuner-logo { margin-left: 47px; }
    @media (max-width: 480px) {
      .player-radio-link { width: calc(100% - 65px - 84px - 12px); }
      .player-mytuner-logo { margin-left: 10px; }
      .volume-controls { display: none; }
    }
  </style>
  <div id="${WIDGET_ID}top-bar" style="background: rgb(229, 244, 255); height: 75px; width: 100%; display: block; padding: 5px; line-height: 65px;">
    <div id="${WIDGET_ID}play-button" class="main-play-button disabled" data-id="${WIDGET_ID}">
      <div class="play-image"></div>
    </div>
    <a class="player-radio-link" href="${streamUrl}" rel="noopener" target="_blank" style="height: 100%; display: inline-block; line-height: 65px; cursor: pointer;">
      <img src="https://static2.mytuner.mobi/media/tvos_radios/bw2nccvcxqzp.jpg" alt="Delta FM 88.3" style="float: left; height: 74px; margin-top: -5px; box-shadow: black 0px 0px 3px -1px;">
      <span class="player-radio-name" style="margin-left: 10px; color: rgb(61, 61, 61); font-weight: bold; font-size: 20px; float: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Delta FM 88.3</span>
    </a>
    <div class="volume-controls">
      <input id="${WIDGET_ID}volume-control" class="volume-control slider" max="100" min="1" orient="vertical" type="range" value="100">
      <svg id="${WIDGET_ID}volume-indicator" class="volume-indicator" height="30" width="30" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="fill: grey; margin: 2px;"><path d="M3 10v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71V6.41c0-.89-1.08-1.34-1.71-.71L7 9H4c-.55 0-1 .45-1 1zm13.5 2c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 4.45v.2c0 .38.25.71.6.85C17.18 6.53 19 9.06 19 12s-1.82 5.47-4.4 6.5c-.36.14-.6.47-.6.85v.2c0 .63.63 1.07 1.21.85C18.6 19.11 21 15.84 21 12s-2.4-7.11-5.79-8.4c-.58-.23-1.21.22-1.21.85z"></path></svg>
    </div>
    <a class="player-mytuner-logo" href="https://mytuner-radio.com?utm_source=widget&amp;utm_medium=player" rel="noopener" target="_blank" style="display: inline-block; vertical-align: top;">
      <img src="https://mytuner-radio.com/static/icons/widgets/MyTuner_Logo/MyTunerLogo_Normal.png" alt="Listen on myTuner radio!" style="height: 36px; width: 84px; vertical-align: middle;">
    </a>
  </div>
  <ul id="${WIDGET_ID}song-history" data-border="1" data-bordercolor="#817f80" style="width: 100%; background-color: rgb(238, 238, 238); max-height: calc(365px); padding: 0px; margin: 0px; overflow-y: scroll;"></ul>
</div>
`

export function MyTunerWidget({ streamUrl, title }: MyTunerWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const normalizedUrl = streamUrl.trim()
  const canUseWidget = useMemo(
    () => normalizedUrl.includes("mytuner-radio.com"),
    [normalizedUrl]
  )
  const canUseNativeAudio = useMemo(
    () => isDirectAudioStream(normalizedUrl) && !canUseWidget,
    [canUseWidget, normalizedUrl]
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container || !canUseWidget) return

    container.innerHTML = buildWidgetHtml(normalizedUrl || DEFAULT_TUNER_URL)

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
  }, [canUseWidget, normalizedUrl])

  if (!normalizedUrl) {
    return (
      <div className="rounded-2xl bg-white/10 p-5 text-white/85">
        Carga una URL de radio para habilitar la reproduccion.
      </div>
    )
  }

  if (canUseNativeAudio) {
    return (
      <div className="space-y-4">
        <audio
          controls
          preload="none"
          src={normalizedUrl}
          className="w-full rounded-2xl bg-white/95 p-3"
        >
          Tu navegador no puede reproducir esta radio.
        </audio>

        <a
          href={normalizedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-2xl border border-white/40 bg-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
        >
          <ExternalLink className="h-4 w-4" />
          Abrir stream en una nueva pestaña
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {canUseWidget ? <div ref={containerRef} className="w-full" /> : null}

      <a
        href={normalizedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-4 text-base font-semibold text-blue-700 shadow-sm transition hover:bg-slate-50"
      >
        <Radio className="h-5 w-5" />
        Escuchar {title} en una nueva pestaña
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  )
}
