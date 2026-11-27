#!/usr/bin/env node
// Monta os dois repositórios corporativos (backend e frontend) a partir deste monorepo,
// sem alterá-lo: copia os arquivos versionados — e os novos ainda não commitados, exceto
// os ignorados pelo .gitignore (.env, node_modules, dist...) — para <destino>/backend e
// <destino>/frontend, e inicializa um repositório Git vazio em cada um (sem commit e sem
// remote: revisar, commitar e publicar fica com a equipe).
//
// Uso (na raiz do monorepo):
//   node migracao/exportar-repositorios.mjs [destino] [--sem-git]
//   destino padrão: ../totem-esg-repositorios
//
// Para levar também o histórico de commits de cada pasta, veja migracao/MIGRACAO.md
// (git subtree split), que preserva autoria e datas originais.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// origem no monorepo → caminho dentro do repositório exportado
const REPOS = {
  backend: [['backend/', '']],
  frontend: [
    ['migracao/repositorio-frontend/', ''],
    ['totem/', 'totem/'],
    ['dashboard/', 'dashboard/'],
    ['brand/', 'brand/'],
  ],
};

const args = process.argv.slice(2);
const initGit = !args.includes('--sem-git');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dest = path.resolve(root, args.find((a) => !a.startsWith('--')) || '../totem-esg-repositorios');

function git(cwd, ...gitArgs) {
  return execFileSync('git', gitArgs, { cwd, encoding: 'utf8' });
}

const files = git(root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard')
  .split('\0')
  .filter((f) => f && fs.existsSync(path.join(root, f))); // ignora arquivos removidos

for (const [name, mapping] of Object.entries(REPOS)) {
  const target = path.join(dest, name);
  if (fs.existsSync(target) && fs.readdirSync(target).length > 0) {
    console.error(`✗ ${target} já existe e não está vazio — escolha outro destino.`);
    process.exit(1);
  }

  let copied = 0;
  for (const file of files) {
    const rule = mapping.find(([from]) => file.startsWith(from));
    if (!rule) continue;
    const out = path.join(target, rule[1] + file.slice(rule[0].length));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.copyFileSync(path.join(root, file), out);
    copied++;
  }

  if (initGit) git(target, 'init', '-q', '-b', 'main');
  console.log(`✓ ${name}: ${copied} arquivos em ${target}${initGit ? ' (git init, sem commit)' : ''}`);
}

console.log(`
Próximos passos, em cada repositório:
  git add -A && git status        # revisar o que entra
  git commit                      # primeiro commit
  git remote add origin <URL do repositório no Azure DevOps>
  git push -u origin main         # depois crie a branch dev a partir da main`);
