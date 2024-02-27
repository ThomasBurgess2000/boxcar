precision highp float;

// Varying variables for lighting calculations
varying vec2 vUV;
varying vec3 vPositionW;
varying vec3 vNormalW;

// Uniforms
uniform sampler2D textureSampler;
uniform vec3 u_color;
uniform vec3 vLightPosition; // Add a light position uniform

void main(void) {
    // Toon shader thresholds and brightness levels
    float ToonThresholds[4];
    ToonThresholds[0] = 0.95;
    ToonThresholds[1] = 0.5;
    ToonThresholds[2] = 0.2;
    ToonThresholds[3] = 0.03;

    float ToonBrightnessLevels[5];
    ToonBrightnessLevels[0] = 1.0;
    ToonBrightnessLevels[1] = 0.8;
    ToonBrightnessLevels[2] = 0.6;
    ToonBrightnessLevels[3] = 0.35;
    ToonBrightnessLevels[4] = 0.2;

    // Light calculation
    vec3 lightVectorW = normalize(vPositionW - vLightPosition);
    float ndl = max(0., dot(vNormalW, lightVectorW));

    // Apply toon shading
    vec3 color = texture2D(textureSampler, vUV).rgb;
    for (int i = 0; i < 4; i++) {
        if (ndl > ToonThresholds[i]) {
            color *= ToonBrightnessLevels[i];
            break;
        }
    }

    // Original luminance and transparency logic
    float luminance = dot(color, vec3(0.299, 0.7, 0.114));
    if (luminance < 0.75) {
        discard;
    }

    gl_FragColor = vec4(u_color * color, luminance);
  }