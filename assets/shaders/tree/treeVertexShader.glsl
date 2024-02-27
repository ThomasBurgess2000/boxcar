attribute vec3 position;
attribute vec2 uv;
attribute vec3 normal;

#include<instancesDeclaration>
uniform mat4 view;
uniform float u_effectBlend;
uniform float u_remap;
uniform float u_normalize;
uniform mat4 projection;

varying vec2 vUV;
varying vec3 vPositionW;
varying vec3 vNormalW;

float inverseLerp(float v, float minValue, float maxValue) {
    return (v - minValue) / (maxValue - minValue);
}

float remap(float v, float inMin, float inMax, float outMin, float outMax) {
    float t = inverseLerp(v, inMin, inMax);
    return mix(outMin, outMax, t);
}

void main() {
    #include<instancesVertex>
    vec2 vertexOffset = vec2(
    remap(uv.x, 0.0, 1.0, -u_remap, 1.0),
    remap(uv.y, 0.0, 1.0, -u_remap, 1.0)
    );

    vertexOffset *= vec2(-1.0, 1.0);

    if (u_remap == 1.0) {
    vertexOffset = mix(vertexOffset, normalize(vertexOffset), u_normalize);
    }

    vec4 worldPosition = finalWorld * vec4(position, 1.0);
    vPositionW = worldPosition.xyz;

    vNormalW = normalize(vec3(finalWorld * vec4(normal, 0.0)));

    vec4 worldViewPosition = view * finalWorld * vec4(position, 1.0);

    worldViewPosition += vec4(mix(vec3(0.0), vec3(vertexOffset, 1.0), u_effectBlend), 0.0);
    
    vUV = uv;

    gl_Position = projection * worldViewPosition;
}