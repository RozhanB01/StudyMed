const db = require("./database");

const result = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all();

console.log("StudyMed tables:");

console.table(result);

db.close();
