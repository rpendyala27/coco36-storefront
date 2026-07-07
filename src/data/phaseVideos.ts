/**
 * Ambient journey clips — one short vertical video per 36-steps phase, used by
 * the homepage hero reel and the 36-steps page. INTERIM stock footage (Pexels
 * free license, SD renditions ≤3 MB each, URLs verified 2026-07-07); swap for
 * real COCO36 origin/warehouse/kitchen footage when shot. Keyed by phase id.
 */
export const PHASE_VIDEOS: Record<string, string> = {
  origin:  'https://videos.pexels.com/video-files/7116726/7116726-sd_540_960_25fps.mp4',   // estate berry harvest
  processing: 'https://videos.pexels.com/video-files/12540973/12540973-sd_540_960_24fps.mp4', // hand-harvesting crops
  quality: 'https://videos.pexels.com/video-files/8852736/8852736-sd_540_960_30fps.mp4',   // lab pipette testing
  craft:   'https://videos.pexels.com/video-files/6092573/6092573-sd_506_960_30fps.mp4',   // pouring melted chocolate
  logistics: 'https://videos.pexels.com/video-files/6169420/6169420-sd_540_960_25fps.mp4', // warehouse clipboard
  kitchen: 'https://videos.pexels.com/video-files/5952083/5952083-sd_506_960_30fps.mp4',   // kneading dough
};
