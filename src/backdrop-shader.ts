export const backdropVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

export const backdropFragmentShader = `
uniform vec2 resolution;
uniform float time;
varying vec2 vUv;

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  
  // Radial vignette centered slightly above middle
  vec2 center = vec2(0.5, 0.52);
  float dist = length(uv - center);
  
  // Deep midnight navy to dark obsidian blue
  vec3 topColor = vec3(8.0, 26.0, 62.0) / 255.0;      // Deep midnight sapphire
  vec3 bottomColor = vec3(2.0, 6.0, 18.0) / 255.0;    // Obsidian abyss
  vec3 centerGlow = vec3(14.0, 42.0, 95.0) / 255.0;   // Subtle reactor backlight
  
  vec3 color = mix(topColor, bottomColor, uv.y * 0.85 + dist * 0.4);
  color += centerGlow * (1.0 - smoothstep(0.0, 0.65, dist)) * 0.35;
  
  // Fine noise dithering to eliminate 8-bit banding
  float noise = (random(gl_FragCoord.xy + fract(time * 0.1)) - 0.5) / 255.0 * 2.0;
  color += noise;
  
  gl_FragColor = vec4(color, 1.0);
}
`;
