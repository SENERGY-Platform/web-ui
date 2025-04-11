// https://stackoverflow.com/a/78262452

// Helper function to rotate a point around a center
function rotatePoint(cx: any, cy: any, angle: any, px: any, py: any): any {
    const s = Math.sin(angle);
    const c = Math.cos(angle);

    // Translate point to origin
    px -= cx;
    py -= cy;

    // Rotate point
    const xnew = px * c - py * s;
    const ynew = px * s + py * c;

    // Translate point back
    return { x: xnew + cx, y: ynew + cy };
}

// Helper function to check if a point is inside a polygon
function isPointInPolygon(polygonObj: any, px: any, py: any): any {
    const polygon = Object.values(polygonObj).filter(point => typeof point === 'object');
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        // @ts-expect-error stack overflow
         const xi = polygon[i].x, yi = polygon[i].y;
        // @ts-expect-error stack overflow
         const xj = polygon[j].x, yj = polygon[j].y;

         // Check if point is on the edge
         const onEdge = (py - yi) * (xj - xi) === (px - xi) * (yj - yi) &&
              Math.min(xi, xj) <= px && px <= Math.max(xi, xj) &&
              Math.min(yi, yj) <= py && py <= Math.max(yi, yj);
         if (onEdge) {
              return true;
         }

         const intersect = ((yi > py) != (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
         if (intersect) inside = !inside;
    }
    return inside;
}

export const findLabel = (labels: any, evt: any): any => {
    if (!labels) {
        return [false, null];
    }
    let found = false;
    let res = null;

    labels.forEach((label: any) => {
        if (isPointInPolygon(label, evt.x, evt.y)) {
            res = {
                label: label.label,
                index: label.index,
            };
            found = true;
        }
    });
    return [found, res];
};

export const getLabelHitBoxes = (x: any): any => {
    if (!x._labelItems) {
        return;
    }

    const hitBoxes = x._labelItems.map((e: any, i: any) => {
        const width = x._labelSizes.widths[i];
        const height = x._labelSizes.heights[i];
        const rotation = e.options.rotation;
        // if there is no rotation the translation is the top center of the label box
        // If there is a rotation the translation is the top right corner of the label box
        let urx;
        if (rotation === 0) {
            urx = e.options.translation[0] + width / 2;
        } else {
            urx = e.options.translation[0];
        }
        const ury = e.options.translation[1];

        // Step 2: Calculate the corners of the rectangle
        const corners = [
            { x: urx, y: ury }, // Top-right
            { x: urx - width, y: ury }, // Top-left
            { x: urx - width, y: ury + height }, // Bottom-left
            { x: urx, y: ury + height }, // Bottom-right
        ];
        // Step 3: Rotate corners around top right corner
        const hitBox = corners.map((corner: any) =>
            rotatePoint(urx, ury, rotation, corner.x, corner.y)
        );

        return { ...hitBox, label: e.label, index: i };
    });
    return hitBoxes;
};

