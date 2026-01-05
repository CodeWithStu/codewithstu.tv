import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Language colors from GitHub
const LANGUAGE_COLORS = {
  'C#': '#178600',
  'JavaScript': '#f1e05a',
  'TypeScript': '#3178c6',
  'Go': '#00ADD8',
  'Python': '#3572A5',
  'Rust': '#dea584',
  'Java': '#b07219',
  'default': '#888'
};

async function fetchRepos() {
  console.log('Loading repos config...');

  const configPath = join(__dirname, '..', 'repos.json');
  const config = JSON.parse(await readFile(configPath, 'utf-8'));

  console.log(`Fetching data for ${config.repos.length} repositories...`);

  const repos = [];

  for (const repo of config.repos) {
    // Extract owner/repo from URL
    const match = repo.url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
      console.warn(`Invalid GitHub URL: ${repo.url}`);
      continue;
    }

    const [, owner, repoName] = match;
    const apiUrl = `https://api.github.com/repos/${owner}/${repoName}`;

    console.log(`Fetching ${owner}/${repoName}...`);

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'CodeWithStu-Site'
      }
    });

    if (!response.ok) {
      console.warn(`Failed to fetch ${repoName}: ${response.status}`);
      continue;
    }

    const data = await response.json();

    repos.push({
      name: data.name,
      url: data.html_url,
      description: repo.description || data.description || '',
      stars: data.stargazers_count,
      language: data.language || 'Unknown',
      goalText: repo.goalText
    });
  }

  console.log(`Fetched ${repos.length} repositories`);

  // Generate HTML for repos section
  const reposHtml = repos.map(repo => {
    const langColor = LANGUAGE_COLORS[repo.language] || LANGUAGE_COLORS.default;
    return `
      <a href="${repo.url}" target="_blank" rel="noopener" class="repo-card" data-fast-goal="${repo.goalText}">
        <div class="repo-info">
          <h3>${escapeHtml(repo.name)}</h3>
          <p class="repo-desc">${escapeHtml(repo.description)}</p>
          <div class="repo-meta">
            <span class="repo-lang" style="--lang-color: ${langColor}">${escapeHtml(repo.language)}</span>
            <span class="repo-stars">
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"></path></svg>
              ${formatNumber(repo.stars)}
            </span>
          </div>
        </div>
      </a>`;
  }).join('\n');

  // Read and update index.html
  const indexPath = join(__dirname, '..', 'index.html');
  let html = await readFile(indexPath, 'utf-8');

  // Replace the repos placeholder
  html = html.replace(
    /<!-- REPOS_START -->[\s\S]*?<!-- REPOS_END -->/,
    `<!-- REPOS_START -->\n${reposHtml}\n    <!-- REPOS_END -->`
  );

  await writeFile(indexPath, html);
  console.log('Updated index.html with repository data');
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatNumber(num) {
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toString();
}

fetchRepos().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
