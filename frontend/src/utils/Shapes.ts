export interface ShapePreset {
    name: string;
    label: string;
    points: { x: number; y: number }[];
}

export const PRESET_SHAPES: ShapePreset[] = [
    {
        name: 'square',
        label: 'Square',
        points: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 1, y: 1 },
            { x: 0, y: 1 },
        ]
    },
    {
        name: 'triangle',
        label: 'Triangle',
        points: [
            { x: 0.5, y: 0 },
            { x: 1, y: 1 },
            { x: 0, y: 1 },
        ]
    },
    {
        name: 'hexagon',
        label: 'Hexagon',
        points: [
            { x: 0.5, y: 0 },
            { x: 1, y: 0.25 },
            { x: 1, y: 0.75 },
            { x: 0.5, y: 1 },
            { x: 0, y: 0.75 },
            { x: 0, y: 0.25 },
        ]
    },
    {
        name: 'star',
        label: 'Star',
        points: [
            { x: 0.5, y: 0 },
            { x: 0.618, y: 0.382 },
            { x: 1, y: 0.382 },
            { x: 0.691, y: 0.618 },
            { x: 0.809, y: 1 },
            { x: 0.5, y: 0.764 },
            { x: 0.191, y: 1 },
            { x: 0.309, y: 0.618 },
            { x: 0, y: 0.382 },
            { x: 0.382, y: 0.382 },
        ]
    }
];
