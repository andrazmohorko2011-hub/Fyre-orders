package com.donutauction;

/** Slightly under-damped spring: gives the Dynamic Island its bouncy "pop". */
public final class Spring {
    public float pos, vel, target;

    public void update(float dt) {
        float k = 260f, c = 17f;
        int steps = 4;
        float h = dt / steps;
        for (int i = 0; i < steps; i++) {
            float a = k * (target - pos) - c * vel;
            vel += a * h;
            pos += vel * h;
        }
    }
}
