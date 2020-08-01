import { h, text, app } from "https://unpkg.com/hyperapp"
import { main, div, h1, button } from "https://unpkg.com/@hyperapp/html"
import { every } from "https://unpkg.com/@hyperapp/time"

const requestNotificationAccess = () => {
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        void Notification.requestPermission();
    }
};

const notify = (text) => {
    if (Notification.permission === "granted") {
        new Notification(text, {
            icon: document.querySelector("link[rel='shortcut icon']").getAttribute('href')
        });
    } else {
        alert(text);
    }
};

const Duration = Object.freeze({
    POMODORO_DURATION: 25 * 60 * 1000,
    SHORT_BREAK_DURATION: 5 * 60 * 1000,//10 * 1000,
    LONG_BREAK_DURATION: 15 * 60 * 1000
});
const Mode = Object.freeze({
    POMODORO_MODE: 0,
    SHORT_BREAK_MODE: 1,
    LONG_BREAK_MODE: 2
});
const Lifecycle = Object.freeze({
    STOPPED_LIFECYCLE: 0,
    RUNNING_LIFECYCLE: 1,
    PAUSED_LIFECYCLE: 2
});

const formatTime = (timestamp) => {
    const minutes = Math.floor(timestamp / 1000 / 60);
    const seconds = minutes > 0
        ? Math.floor((timestamp / 1000) % (minutes * 60))
        : Math.floor((timestamp / 1000));
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

const updateTitle = (timeRemaining) => {
    document.title = formatTime(timeRemaining);
}

const ChangeModeToPomodoro = (state) => ({
    ...state,
    timeRemaining: Duration.POMODORO_DURATION,
    mode: Mode.POMODORO_MODE
});

const ChangeModeToShortBreak = (state) => ({
    ...state,
    timeRemaining: Duration.SHORT_BREAK_DURATION,
    mode: Mode.SHORT_BREAK_MODE
});
const ChangeModeToLongBreak = (state) => ({
    ...state,
    timeRemaining: Duration.LONG_BREAK_DURATION,
    mode: Mode.LONG_BREAK_MODE
});

const StartTimer = (state) => {
    requestNotificationAccess();
    updateTitle(state.timeRemaining);
    return {
        ...state,
        lifecycle: Lifecycle.RUNNING_LIFECYCLE
    };
};

const PauseTimer = (state) => ({
    ...state,
    lifecycle: Lifecycle.PAUSED_LIFECYCLE
});

const StopTimer = (state) => ({
    ...state,
    timeRemaining: state.mode === Mode.POMODORO_MODE
        ? Duration.POMODORO_DURATION
        : state.mode === Mode.SHORT_BREAK_MODE
            ? Duration.SHORT_BREAK_DURATION
            : -1,
    lifecycle: Lifecycle.STOPPED_LIFECYCLE
});

const OneSecond = 1000;
const Tick = (state) => {
    const timeIsUp = state.timeRemaining === 0;
    if (timeIsUp) {
        notify('Time is up!');
        return {
            ...state,
            lifecycle: Lifecycle.STOPPED_LIFECYCLE
        };
    }

    const newTimeRemaining = state.timeRemaining - OneSecond;
    updateTitle(newTimeRemaining);
    return {
        ...state,
        timeRemaining: newTimeRemaining
    };
};


app({
    init: { timeRemaining: Duration.POMODORO_DURATION, mode: Mode.POMODORO_MODE, lifecycle: Lifecycle.STOPPED_LIFECYCLE },
    view: ({ timeRemaining, mode, lifecycle }) =>
        main({}, [
            div({},
                div({
                    class: "btn-group btn-group-toggle mb-3"
                }, [
                    button({
                        class: `btn ${mode === Mode.POMODORO_MODE ? 'btn-primary' : 'btn-outline-primary'}`,
                        onclick: ChangeModeToPomodoro
                    }, text("Pomodoro")),
                    button({
                        class: `btn ${mode === Mode.SHORT_BREAK_MODE ? 'btn-primary' : 'btn-outline-primary'}`,
                        onclick: ChangeModeToShortBreak
                    }, text("Short break")),
                    button({
                        class: `btn ${mode === Mode.LONG_BREAK_MODE ? 'btn-primary' : 'btn-outline-primary'}`,
                        onclick: ChangeModeToLongBreak
                    }, text("Long break"))
                ])
            ),
            div({},
                div({
                    class: "btn-group btn-group-toggle mb-3"
                }, [
                    button({
                        class: `btn ${lifecycle === Lifecycle.RUNNING_LIFECYCLE ? 'btn-info' : 'btn-outline-info'}`,
                        onclick: StartTimer
                    }, text("Start")),
                    button({
                        class: `btn ${lifecycle === Lifecycle.PAUSED_LIFECYCLE ? 'btn-info' : 'btn-outline-info'}`,
                        onclick: PauseTimer
                    }, text("Pause")),
                    button({
                        class: `btn ${lifecycle === Lifecycle.STOPPED_LIFECYCLE ? 'btn-info' : 'btn-outline-info'}`,
                        onclick: StopTimer
                    }, text("Stop")),
                ]),
            ),
            h1({
                class: "display-3"
            }, text(formatTime(timeRemaining)))
        ]),
    subscriptions: (state) => [
        state.lifecycle === Lifecycle.RUNNING_LIFECYCLE && every(OneSecond, Tick)
    ],
    node: document.getElementById("app"),
})