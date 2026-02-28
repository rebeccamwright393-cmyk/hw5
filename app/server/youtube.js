/**
 * YouTube channel download via youtubei.js
 * Extracts channel ID from URL, fetches videos, gets metadata per video.
 */

function extractText(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  if (obj.text !== undefined) return String(obj.text || '');
  if (obj.snippet?.text !== undefined) return String(obj.snippet.text || '');
  return '';
}

function extractSegments(transcriptInfo) {
  if (!transcriptInfo?.transcript?.content?.body?.initial_segments) return null;
  const segments = transcriptInfo.transcript.content.body.initial_segments;
  const parts = [];
  for (const seg of segments) {
    if (seg.snippet) {
      const t = extractText(seg.snippet);
      if (t) parts.push(t);
    }
  }
  return parts.length ? parts.join('\n') : null;
}

async function downloadChannelData(channelUrl, maxVideos = 10, onProgress) {
  const { Innertube } = await import('youtubei.js');

  if (!channelUrl || typeof channelUrl !== 'string') {
    throw new Error('Invalid channel URL');
  }
  const cap = Math.min(Math.max(1, parseInt(String(maxVideos), 10) || 10), 100);

  const innertube = await Innertube.create({
    retrieve_player: false,
    generate_session_locally: true,
  });

  if (!innertube?.session?.actions) {
    throw new Error('Failed to initialize YouTube client');
  }

  // Resolve channel URL to endpoint (returns NavigationEndpoint directly)
  let endpoint;
  try {
    endpoint = await innertube.resolveURL(channelUrl.trim());
  } catch (e) {
    throw new Error('Could not resolve channel URL. Check the URL and try again.');
  }
  if (!endpoint) {
    throw new Error('Could not resolve channel URL. Check the URL and try again.');
  }

  let channelId = endpoint?.payload?.browse_id || endpoint?.payload?.browseId;
  if (!channelId && endpoint?.payload?.canonical_base_url) {
    channelId = endpoint.payload.canonical_base_url.replace(/^\//, '').split('/')[0];
  }

  let chan;
  if (channelId) {
    try {
      chan = await innertube.getChannel(channelId);
    } catch (_) {}
  }
  if (!chan) {
    const nav = await endpoint.call(innertube.session.actions, { parse: true });
    chan = nav?.page || nav;
  }
  if (!chan) {
    throw new Error('Channel not found. Invalid URL or channel may be private.');
  }

  let videosFeed = chan;
  if (chan.getVideos && typeof chan.getVideos === 'function') {
    try {
      videosFeed = await chan.getVideos();
    } catch (_) {}
  }

  const videos = videosFeed?.videos;
  const list = Array.isArray(videos) ? videos : videos ? [...videos] : [];
  const videoIds = [];
  for (const v of list) {
    const id = v.video_id ?? v.id ?? v.payload?.videoId;
    if (id && !videoIds.includes(id)) videoIds.push(id);
    if (videoIds.length >= cap) break;
  }

  const channelTitle = chan?.metadata?.title || endpoint?.payload?.title || 'Unknown Channel';
  const results = [];
  const total = videoIds.length;

  for (let i = 0; i < videoIds.length; i++) {
    const videoId = videoIds[i];
    if (onProgress) onProgress({ current: i + 1, total, videoId });

    try {
      const info = await innertube.getInfo(videoId);
      const basic = info?.basic_info || info?.page?.[0]?.basic_info || {};
      const primary = info?.primary_info;
      const secondary = info?.secondary_info;

      let view_count = basic.view_count;
      if (view_count == null && primary?.view_count?.original_view_count) {
        const v = primary.view_count.original_view_count;
        view_count = typeof v === 'number' ? v : parseInt(String(v).replace(/[^0-9]/g, ''), 10) || 0;
      }
      if (view_count == null && primary?.view_count?.short_view_count) {
        view_count = parseInt(String(extractText(primary.view_count.short_view_count)).replace(/[^0-9]/g, ''), 10) || 0;
      }

      let like_count = basic.like_count;
      if (like_count == null && primary?.like_count != null) {
        like_count = parseInt(String(primary.like_count).replace(/[^0-9]/g, ''), 10) || 0;
      }

      let comment_count = basic.comment_count;
      if (comment_count == null && secondary?.comments_entry_point_header?.comment_count) {
        const cc = secondary.comments_entry_point_header.comment_count;
        comment_count = typeof cc === 'number' ? cc : parseInt(String(cc).replace(/[^0-9]/g, ''), 10) || 0;
      }
      if (comment_count == null && secondary?.comment_count) {
        comment_count = parseInt(String(secondary.comment_count).replace(/[^0-9]/g, ''), 10) || 0;
      }

      let duration = basic.duration;
      if (duration == null && primary?.duration) {
        const d = primary.duration;
        duration = typeof d === 'number' ? d : (d.seconds ?? 0);
      }

      const thumbnails = basic.thumbnail || info?.page?.[0]?.video_details?.thumbnail?.thumbnails || [];
      const thumb = Array.isArray(thumbnails) && thumbnails.length ? thumbnails[thumbnails.length - 1] : null;
      const thumbnailUrl = thumb?.url || (typeof thumb === 'string' ? thumb : '');

      let transcript = null;
      try {
        if (info?.getTranscript && typeof info.getTranscript === 'function') {
          const ti = await info.getTranscript();
          transcript = extractSegments(ti);
        }
      } catch (_) {
        transcript = null;
      }

      let release_date = basic.start_timestamp || basic.published;
      if (!release_date && primary?.date_text) {
        release_date = extractText(primary.date_text);
      }
      if (release_date instanceof Date) release_date = release_date.toISOString();
      if (release_date && typeof release_date !== 'string') release_date = String(release_date);

      results.push({
        video_id: videoId,
        title: basic.title || extractText(primary?.title) || 'Unknown',
        description: basic.short_description || basic.description || extractText(secondary?.description) || '',
        transcript: transcript,
        duration: duration != null ? Number(duration) : null,
        release_date: release_date || null,
        view_count: view_count != null ? Number(view_count) : null,
        like_count: like_count != null ? Number(like_count) : null,
        comment_count: comment_count != null ? Number(comment_count) : null,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnailUrl: thumbnailUrl || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      });
    } catch (err) {
      results.push({
        video_id: videoId,
        title: 'Error',
        description: '',
        transcript: null,
        duration: null,
        release_date: null,
        view_count: null,
        like_count: null,
        comment_count: null,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/default.jpg`,
        error: err.message || 'Failed to fetch video metadata',
      });
    }

    // Brief pause to reduce rate limiting
    if (i < videoIds.length - 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return {
    channelTitle,
    channelUrl: channelUrl.trim(),
    videos: results,
    totalVideos: results.length,
  };
}

module.exports = { downloadChannelData };
