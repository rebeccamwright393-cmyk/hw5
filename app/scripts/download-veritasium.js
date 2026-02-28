#!/usr/bin/env node
/**
 * Downloads Veritasium channel data (10 videos) and saves to public/veritasium_channel_data.json
 */
const path = require('path');
const fs = require('fs');
const { downloadChannelData } = require('../server/youtube');

async function main() {
  const channelUrl = 'https://www.youtube.com/@veritasium';
  const maxVideos = 10;
  const outPath = path.join(__dirname, '..', 'public', 'veritasium_channel_data.json');

  console.log(`Downloading ${maxVideos} videos from ${channelUrl}...`);

  const data = await downloadChannelData(channelUrl, maxVideos, ({ current, total, videoId }) => {
    console.log(`  [${current}/${total}] ${videoId}`);
  });

  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Saved to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
