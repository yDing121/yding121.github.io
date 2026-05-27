// assets/js/fridge/main.js
import { watchAuth, bindLoginForm, bindSignOut } from "./auth.js";

const loginEl = document.getElementById("fridge-login");
const boardEl = document.getElementById("fridge-board");

bindLoginForm("fridge-login-form", "fridge-login-error");
bindSignOut("fridge-signout");

watchAuth(
  (user) => {
    loginEl.classList.add("hidden");
    boardEl.classList.remove("hidden");
    console.log("fridge: signed in as", user.uid);
  },
  () => {
    loginEl.classList.remove("hidden");
    boardEl.classList.add("hidden");
  },
);
