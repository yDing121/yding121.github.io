---
layout: fridge
permalink: /fridge/archive/
title: fridge archive
nav: false
entry_script: /assets/js/fridge/archive.js
---

<section id="fridge-login" class="fridge-login hidden">
  <form id="fridge-login-form">
    <input type="email" id="fridge-email" placeholder="email" required />
    <input type="password" id="fridge-password" placeholder="password" required />
    <button type="submit">enter</button>
    <p id="fridge-login-error" class="error"></p>
  </form>
</section>

<section id="fridge-archive" class="fridge-archive hidden">
  <div class="archive-toolbar">
    <a href="/fridge/">← back to fridge</a>
    <label><input type="checkbox" id="fridge-show-archived" /> show hidden</label>
  </div>
  <ul id="fridge-archive-list" class="archive-list"></ul>
</section>

<div id="fridge-modal-root"></div>
