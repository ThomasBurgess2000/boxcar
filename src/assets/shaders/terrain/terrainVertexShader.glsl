precision highp float;

attribute vec3 position;
attribute vec2 uv;

uniform mat4 worldViewProjection;

varying float vHeight;
varying vec2 vUV;

void main() {
    vHeight = position.y;
    vUV = uv;
    gl_Position = worldViewProjection * vec4(position, 1.0);
}