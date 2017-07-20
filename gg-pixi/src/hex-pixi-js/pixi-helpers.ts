export function updateLineStyle(lineWidth, color, alpha) {
    let len = this.graphicsData.length;
    for (let i = 0; i < len; i++) {
        let data = this.graphicsData[i];
        if (data.lineWidth && lineWidth) {
            data.lineWidth = lineWidth;
        }
        if (data.lineColor && color) {
            data.lineColor = color;
        }
        if (data.alpha && alpha) {
            data.alpha = alpha;
        }
        this.dirty = true;
        this.clearDirty = true;
    }
};

export function updateFillColor(fillColor, alpha) {
    let len = this.graphicsData.length;
    for (let i = 0; i < len; i++) {
        let data = this.graphicsData[i];
        if (data.fillColor && fillColor) {
            data.fillColor = fillColor;
        }
        if (data.alpha && alpha) {
            data.alpha = alpha;
        }
        this.dirty = true;
        this.clearDirty = true;
    }
};
