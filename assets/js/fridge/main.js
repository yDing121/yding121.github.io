// assets/js/fridge/main.js (temporary smoke test)
import { auth, db, storage } from "./firebase-init.js";
console.log("fridge init", { auth: !!auth, db: !!db, storage: !!storage });
