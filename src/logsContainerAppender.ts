function logsContainerAppender(layout: any) {
    return (loggingEvent: any) => {
        console.log(layout(loggingEvent));
    };
}

function configure(config: any, layouts: any) {
    const layout = layouts.layout(config.layout.type, config.layout);
    return logsContainerAppender(layout);
}

exports.configure = configure;
