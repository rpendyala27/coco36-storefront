/**
 * Ambient journey clips — one short vertical video per 36-steps phase, used by
 * the homepage hero reel and the 36-steps page. INTERIM stock footage (Pexels
 * free license, small 360-wide SD renditions ~0.5–1.5 MB each — half the
 * bytes of the old 540-wide files, ample for tiles that render ≤200 px wide;
 * swap for real COCO36 footage when shot. Keyed by phase id.
 *
 * Every clip has a matching self-hosted poster (first frame, ~20–75 KB JPEG,
 * public/hero-posters/<pexels-id>.jpg) so AmbientVideo can paint instantly and
 * defer — or on phones skip — the multi-MB video download.
 */
export const PHASE_VIDEOS: Record<string, string> = {
  origin:  'https://videos.pexels.com/video-files/7782542/7782542-sd_360_640_30fps.mp4',   // hands sowing seeds in soil
  processing: 'https://videos.pexels.com/video-files/12540973/12540973-sd_360_640_24fps.mp4', // hand-harvesting crops
  quality: 'https://videos.pexels.com/video-files/9573566/9573566-sd_338_640_25fps.mp4',   // lab technician at microscope (food testing)
  craft:   'https://videos.pexels.com/video-files/6846170/6846170-sd_360_640_30fps.mp4',   // matcha powder sifted in closeup
  logistics: 'https://videos.pexels.com/video-files/6169420/6169420-sd_360_640_25fps.mp4', // warehouse clipboard
  kitchen: 'https://videos.pexels.com/video-files/6181811/6181811-sd_360_640_30fps.mp4',   // piping frosting (was kneading-dough — too close to craft's bowl)
};

export const PHASE_POSTERS: Record<string, string> = {
  origin:     '/hero-posters/7782542.jpg',
  processing: '/hero-posters/12540973.jpg',
  quality:    '/hero-posters/9573566.jpg',
  craft:      '/hero-posters/6846170.jpg',
  logistics:  '/hero-posters/6169420.jpg',
  kitchen:    '/hero-posters/6181811.jpg',
};
