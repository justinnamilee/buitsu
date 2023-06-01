import {hiragana, katakana, romaji} from "/script/util/japanese.js"

console.log("Hiragana object:");
console.log(hiragana);

console.log("");
console.log("Katakana object:");
console.log(katakana);

console.log("");
console.log("Romaji object:");
console.log(romaji);

console.log("");
console.log("Hiragana checks:");
for (const l in hiragana) {
  console.log(l + " is valid: " + String(hiragana[l].length === romaji[l].length))
}

console.log("");
console.log("Katakana checks:");
for (const l in katakana) {
  console.log(l + " is valid: " + String(katakana[l].length === romaji[l].length))
}
