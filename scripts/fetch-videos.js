import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHANNEL_ID = 'UCF5dh7bm49bpsZjWHYDG4Lg';
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const VIDEO_COUNT = 3;

async function fetchVideos() {
  console.log('Fetching YouTube RSS feed...');

  const response = await fetch(RSS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch RSS: ${response.status}`);
  }

  const xml = await response.text();

  // Parse videos from XML
  const videos = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null && videos.length < VIDEO_COUNT) {
    const entry = match[1];

    const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const title = entry.match(/<title>([^<]+)<\/title>/)?.[1];
    const published = entry.match(/<published>([^<]+)<\/published>/)?.[1];

    if (videoId && title) {
      videos.push({
        id: videoId,
        title: decodeHTMLEntities(title),
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        published: new Date(published).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      });
    }
  }

  console.log(`Found ${videos.length} videos`);

  // Generate HTML for videos section
  const videosHtml = videos.map(video => `
      <a href="${video.url}" target="_blank" rel="noopener" class="video-card">
        <img src="${video.thumbnail}" alt="${escapeHtml(video.title)}" loading="lazy" width="320" height="180">
        <div class="video-info">
          <h3>${escapeHtml(video.title)}</h3>
          <time>${video.published}</time>
        </div>
      </a>`).join('\n');

  // Read and update index.html
  const indexPath = join(__dirname, '..', 'index.html');
  let html = await readFile(indexPath, 'utf-8');

  // Replace the videos placeholder
  html = html.replace(
    /<!-- VIDEOS_START -->[\s\S]*?<!-- VIDEOS_END -->/,
    `<!-- VIDEOS_START -->\n${videosHtml}\n    <!-- VIDEOS_END -->`
  );

  await writeFile(indexPath, html);
  console.log('Updated index.html with latest videos');
}

function decodeHTMLEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

fetchVideos().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
