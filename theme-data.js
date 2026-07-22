(function () {
    const groups = [
        { id: 'warm', name: '暖色' },
        { id: 'quiet', name: '静色' },
        { id: 'nature', name: '自然' },
    ];

    const effects = [
        { id: 'petal', name: '花瓣', icon: 'flower-2' },
        { id: 'maple', name: '枫叶', icon: 'leaf' },
        { id: 'bamboo', name: '竹叶', icon: 'sprout' },
    ];

    const cursorDots = [
        { id: 'theme', name: '跟随主题', color: null },
        { id: 'frost', name: '霜白', color: '#f2eee7' },
        { id: 'coral', name: '珊瑚', color: '#ee9984' },
        { id: 'sky', name: '天青', color: '#8fb5c7' },
        { id: 'bamboo', name: '青竹', color: '#93c39f' },
        { id: 'plum', name: '浅梅', color: '#c6a2bd' },
        { id: 'amber', name: '琥珀', color: '#dfb36e' },
    ];

    const presets = [
        {
            id: 'coral',
            name: '珊瑚',
            group: 'warm',
            dark: {
                accent: '#df8874', accentStrong: '#ee9984',
                falling: { petal: ['#df8874', '#e8b3a7'], maple: ['#c98562', '#df8874'], bamboo: ['#8ea18d', '#b2bca9'] },
            },
            light: {
                accent: '#a95042', accentStrong: '#913f34',
                falling: { petal: ['#c96f5d', '#dfa092'], maple: ['#ad6344', '#c98562'], bamboo: ['#657d65', '#91a287'] },
            },
        },
        {
            id: 'classic-coral',
            name: '经典珊瑚',
            group: 'warm',
            dark: {
                accent: '#f78c6c', accentStrong: '#ffab91',
                falling: { petal: ['#f78c6c', '#ffc0ad'], maple: ['#e77955', '#f4a896'], bamboo: ['#92a485', '#b8c5a8'] },
            },
            light: {
                accent: '#b34734', accentStrong: '#9e3828',
                falling: { petal: ['#d9654e', '#ef9b87'], maple: ['#bd5438', '#dc795d'], bamboo: ['#61795b', '#8ba07e'] },
            },
        },
        {
            id: 'amber',
            name: '琥珀',
            group: 'warm',
            dark: {
                accent: '#d2a267', accentStrong: '#e2b178',
                falling: { petal: ['#d2a267', '#e2c49b'], maple: ['#c58a4c', '#dfad69'], bamboo: ['#89966f', '#b0b792'] },
            },
            light: {
                accent: '#94602b', accentStrong: '#7e4e20',
                falling: { petal: ['#b47a3d', '#d2a267'], maple: ['#9f672e', '#c28645'], bamboo: ['#687251', '#8c976d'] },
            },
        },
        {
            id: 'terracotta',
            name: '砖橙',
            group: 'warm',
            dark: {
                accent: '#c98562', accentStrong: '#dc9975',
                falling: { petal: ['#c98562', '#dda58a'], maple: ['#b96f4e', '#d28b66'], bamboo: ['#889276', '#abb398'] },
            },
            light: {
                accent: '#975337', accentStrong: '#7f432c',
                falling: { petal: ['#ad6344', '#cd896b'], maple: ['#975337', '#b96f4e'], bamboo: ['#626d50', '#87906e'] },
            },
        },
        {
            id: 'blue',
            name: '蓝灰',
            group: 'quiet',
            dark: {
                accent: '#7f9fb0', accentStrong: '#94b7c8',
                falling: { petal: ['#7f9fb0', '#abc0ca'], maple: ['#6f8fa2', '#91aeba'], bamboo: ['#799a93', '#a2b7ad'] },
            },
            light: {
                accent: '#426d83', accentStrong: '#365c70',
                falling: { petal: ['#537d92', '#7f9fb0'], maple: ['#426d83', '#64889b'], bamboo: ['#53766d', '#789188'] },
            },
        },
        {
            id: 'indigo',
            name: '靛青',
            group: 'quiet',
            dark: {
                accent: '#728da8', accentStrong: '#8ca9c3',
                falling: { petal: ['#728da8', '#9dafc2'], maple: ['#667f9a', '#849bb2'], bamboo: ['#738c88', '#9aadaa'] },
            },
            light: {
                accent: '#4c6d8f', accentStrong: '#3c5e7e',
                falling: { petal: ['#4c6d8f', '#728da8'], maple: ['#3c5e7e', '#597998'], bamboo: ['#506c68', '#718985'] },
            },
        },
        {
            id: 'rose',
            name: '灰玫瑰',
            group: 'quiet',
            dark: {
                accent: '#c88e9b', accentStrong: '#d9a2ae',
                falling: { petal: ['#c88e9b', '#ddb2bb'], maple: ['#ae7b88', '#c9969f'], bamboo: ['#87928a', '#aeb5ac'] },
            },
            light: {
                accent: '#925567', accentStrong: '#7b4657',
                falling: { petal: ['#a96878', '#c88e9b'], maple: ['#925567', '#b47784'], bamboo: ['#626e65', '#858f86'] },
            },
        },
        {
            id: 'plum',
            name: '梅紫',
            group: 'quiet',
            dark: {
                accent: '#ad8fa8', accentStrong: '#c2a5bb',
                falling: { petal: ['#ad8fa8', '#cbb6c7'], maple: ['#997e95', '#b69bac'], bamboo: ['#82918b', '#a8b2aa'] },
            },
            light: {
                accent: '#79526a', accentStrong: '#68445a',
                falling: { petal: ['#8e667f', '#ad8fa8'], maple: ['#79526a', '#987187'], bamboo: ['#5c6d66', '#7d8b84'] },
            },
        },
        {
            id: 'moss',
            name: '苔庭',
            group: 'nature',
            dark: {
                accent: '#7cb98a', accentStrong: '#9bcca6',
                falling: { petal: ['#7cb98a', '#a7cdb0'], maple: ['#6a9d73', '#8fba91'], bamboo: ['#4a7c59', '#7cb98a'] },
            },
            light: {
                accent: '#3f704e', accentStrong: '#315d3e',
                falling: { petal: ['#4a7c59', '#7cb98a'], maple: ['#3f6c4c', '#668e69'], bamboo: ['#365f43', '#5e8668'] },
            },
        },
        {
            id: 'mint',
            name: '薄荷',
            group: 'nature',
            dark: {
                accent: '#8bc9a0', accentStrong: '#a9d9b8',
                falling: { petal: ['#8bc9a0', '#b3d8bf'], maple: ['#76ae87', '#9bc39c'], bamboo: ['#5d9870', '#8bc9a0'] },
            },
            light: {
                accent: '#3f754f', accentStrong: '#32613f',
                falling: { petal: ['#4f8661', '#79aa86'], maple: ['#477758', '#679474'], bamboo: ['#3d704f', '#628e6c'] },
            },
        },
    ];

    window.QiufengThemeData = Object.freeze({
        defaultAccent: 'coral',
        defaultEffect: 'petal',
        defaultCursorDot: 'theme',
        groups,
        effects,
        cursorDots,
        presets,
        pageColors: Object.freeze({ dark: '#151716', light: '#f3efe8' }),
    });
}());
