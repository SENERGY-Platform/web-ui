export function detectAndMergeFlapping(values: any[][], maxChanges = 3, windowSeconds = 60) {
    if (!values || values.length < 2) return values;

    const result = [];
    let i = 0;

    const intermediate: any[][] = values.map(v => [new Date(v[0]).valueOf() / 1000, v[1]]);

    while (i < values.length) {
        const [baseTs, baseVal] = intermediate[i];

        let changes = 0;
        let j = i + 1;

        while (j < intermediate.length && intermediate[j][0] - baseTs <= windowSeconds) {
            if (intermediate[j - 1][1] !== intermediate[j][1]) {
                changes++;
            }
            j++;
        }

        if (changes > maxChanges) {
            let flappingEnd = j;

            while (flappingEnd < intermediate.length) {
                let localChanges = 0;
                const localBaseTs = new Date(intermediate[flappingEnd][0]).valueOf() / 1000;
                let k = flappingEnd + 1;

                while (k < intermediate.length && intermediate[k][0] - localBaseTs <= windowSeconds) {
                    if (intermediate[k - 1][1] !== intermediate[k][1]) {
                        localChanges++;
                    }
                    k++;
                }

                if (localChanges > maxChanges) {
                    flappingEnd = k;
                } else {
                    break;
                }
            }

            result.push([new Date(baseTs * 1000).toISOString(), 'flapping']);
            i = flappingEnd;
        } else {
            result.push([new Date(baseTs * 1000).toISOString(), baseVal]);
            i++;
        }
    }
    return result;
}
