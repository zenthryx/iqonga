/**
 * SkillLoader – OpenClaw-inspired skills for cloud (no browser/exec).
 * Loads SKILL.md definitions from bundled and optional company/agent dirs,
 * applies gating, and formats for injection into agent system prompt.
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

const SKILL_FILENAME = 'SKILL.md';
const DEFAULT_BUNDLED_DIR = path.join(__dirname, '../skills');

/**
 * Parse SKILL.md content: YAML frontmatter (optional) + body.
 * Frontmatter: name, description, optional metadata (e.g. requires.env).
 */
function parseSkillMd(content) {
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  let name = 'skill';
  let description = '';
  let metadata = {};
  let body = content;

  if (frontmatterMatch) {
    const yaml = frontmatterMatch[1];
    body = frontmatterMatch[2].trim();
    const lines = yaml.split('\n');
    for (const line of lines) {
      const m = line.match(/^(\w+):\s*(.*)$/);
      if (m) {
        const key = m[1];
        let value = m[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (key === 'metadata' && value.startsWith('{')) {
          try { metadata = JSON.parse(value); } catch (_) { /* ignore */ }
        } else if (key === 'name') name = value;
        else if (key === 'description') description = value;
      }
    }
  }

  return { name, description, metadata, body };
}

/**
 * Load one skill from a directory (expects SKILL.md).
 */
async function loadSkillFromDir(dirPath) {
  const skillPath = path.join(dirPath, SKILL_FILENAME);
  try {
    const content = await fs.readFile(skillPath, 'utf8');
    const parsed = parseSkillMd(content);
    return {
      name: parsed.name,
      description: parsed.description,
      body: parsed.body,
      metadata: parsed.metadata,
      source: dirPath
    };
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    logger.warn(`SkillLoader: failed to load ${skillPath}:`, err.message);
    return null;
  }
}

/**
 * Check if skill is allowed by gating (e.g. requires.env).
 */
function isSkillGated(skill, config = {}) {
  const req = skill.metadata?.requires || {};
  if (req.env && Array.isArray(req.env)) {
    for (const key of req.env) {
      if (!process.env[key] && !config.env?.[key]) return true;
    }
  }
  if (req.config && config.skills?.entries?.[skill.name]?.enabled === false) return true;
  return false;
}

/**
 * Load all skills from a root directory (one level: each subdir can contain SKILL.md).
 */
async function loadSkillsFromRoot(rootDir, config = {}) {
  const skills = [];
  try {
    const entries = await fs.readdir(rootDir, { withFileTypes: true });
    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      const skill = await loadSkillFromDir(path.join(rootDir, ent.name));
      if (skill && !isSkillGated(skill, config)) skills.push(skill);
    }
  } catch (err) {
    if (err.code !== 'ENOENT') logger.warn('SkillLoader: failed to read dir', rootDir, err.message);
  }
  return skills;
}

class SkillLoader {
  constructor(options = {}) {
    this.bundledDir = options.bundledDir || DEFAULT_BUNDLED_DIR;
    this.config = options.config || {};
  }

  /**
   * Get eligible skills for an agent/company (bundled + optional company/agent dirs).
   * companySkillsDir and agentSkillsDir are optional paths.
   */
  async getSkillsForAgent(companySkillsDir = null, agentSkillsDir = null) {
    const all = [];
    const seen = new Set();

    const add = (list) => {
      for (const s of list) {
        if (!seen.has(s.name)) {
          seen.add(s.name);
          all.push(s);
        }
      }
    };

    add(await loadSkillsFromRoot(this.bundledDir, this.config));
    if (companySkillsDir) add(await loadSkillsFromRoot(companySkillsDir, this.config));
    if (agentSkillsDir) add(await loadSkillsFromRoot(agentSkillsDir, this.config));

    return all;
  }

  /**
   * Format skills for injection into the agent system prompt.
   */
  formatSkillsForPrompt(skills) {
    if (!skills || skills.length === 0) return '';
    const lines = [
      '',
      '## Available skills (use when relevant)',
      ''
    ];
    for (const s of skills) {
      lines.push(`### ${s.name}`);
      if (s.description) lines.push(s.description);
      lines.push('');
      lines.push(s.body);
      lines.push('');
    }
    return lines.join('\n');
  }
}

/**
 * Convenience: load bundled skills and return formatted string for prompt.
 */
async function getFormattedSkillsForPrompt(options = {}) {
  const loader = new SkillLoader(options);
  const skills = await loader.getSkillsForAgent(
    options.companySkillsDir,
    options.agentSkillsDir
  );
  return loader.formatSkillsForPrompt(skills);
}

module.exports = {
  SkillLoader,
  getFormattedSkillsForPrompt,
  parseSkillMd,
  loadSkillFromDir,
  loadSkillsFromRoot,
  isSkillGated
};
