// @flow

let pug;

const cfg = require("./config").cfg;

const compiledPugs = {};
function renderPug(templatePath: string, pageVars: Object = {}) {
  if (!pug) {
    pug = require("pug");
  }

  templatePath =
    templatePath.indexOf(".pug") === -1 ? `${templatePath}.pug` : templatePath; // eslint-disable-line
  let html;

  if (typeof compiledPugs[templatePath] === "function") {
    html = compiledPugs[templatePath](pageVars);
  } else {
    compiledPugs[templatePath] = compilePug(templatePath);
    html = compiledPugs[templatePath](pageVars);
  }
  return html;
}

function compilePug(templatePath: string) {
  return pug.compileFile(
    `${cfg.pugOptions.basedir}${
      templatePath[0] === "/" ? "" : "/"
    }${templatePath}`,
    cfg.pugOptions
  );
}

module.exports = { renderPug };
