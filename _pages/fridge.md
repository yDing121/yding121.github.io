---
layout: fridge
permalink: /fridge/
title: fridge
nav: false
entry_script: /assets/js/fridge/main.js
---

<section id="fridge-login" class="fridge-login hidden">
  <form id="fridge-login-form">
    <input type="email" id="fridge-email" placeholder="email" autocomplete="email" required />
    <input type="password" id="fridge-password" placeholder="password" autocomplete="current-password" required />
    <button type="submit">enter</button>
    <p id="fridge-login-error" class="error"></p>
  </form>
</section>

<section id="fridge-board" class="fridge-board hidden">
  <div id="fridge-toolbar" class="fridge-toolbar">
    <button id="fridge-new" type="button">+ new note</button>
    <label class="cap-label">
      showing <span id="fridge-cap-value">5</span>
      <input id="fridge-cap" type="range" min="1" max="20" value="5" />
    </label>
    <button id="fridge-shuffle-wallpaper" type="button" title="shuffle wallpaper">↻</button>
    <button id="fridge-wallpapers" type="button">wallpapers</button>
    <a id="fridge-archive-link" href="/fridge/archive/">archive →</a>
    <button id="fridge-signout" type="button">sign out</button>
  </div>
  <div id="fridge-stage" class="fridge-stage"></div>
</section>

<div id="fridge-modal-root"></div>
