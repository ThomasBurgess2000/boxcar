#ifdef GL_ES
precision highp float;
#endif
varying float vHeight;
uniform float lowestPoint;
uniform float highestPoint;
uniform float seaLevel;
uniform float mountainLevel;
varying vec2 vUV;
uniform sampler2D noiseTexture;

void main(void) {
    vec3 color;
    float noise = texture2D(noiseTexture, vUV).r;
    if (vHeight <= seaLevel) {
        float depthFactor = (vHeight - lowestPoint) / (seaLevel - lowestPoint);
        color = mix(vec3(0.0, 0.0, 0.3), vec3(0.0, 0.0, 1.0), depthFactor);
    } else if (vHeight <= mountainLevel) {
        float noiseFactor = mix(0.4, 0.6, noise); 
        color = vec3(0.0, noiseFactor, 0.0);
        } else {
        color = vec3(1.0, 1.0, 1.0);
    }
    
    gl_FragColor = vec4(color, 1.0);
}