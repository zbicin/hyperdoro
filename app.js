import { app } from "https://unpkg.com/hyperapp"
import html from 'https://unpkg.com/hyperlit'
import { every } from "https://unpkg.com/@hyperapp/time"

const faviconUrl = document.querySelector("link[rel='shortcut icon']").getAttribute('href');

const RequestNotificationAccess = (() => {
    const effectFn = (dispatch, opts) => {
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
            void Notification.requestPermission();
        }
    }
    return () => [effectFn, {}];
})();

const UpdateTitle = (() => {
    const effectFn = (dispatch, opts) => {
        document.title = opts.title;
    };
    return title => [effectFn, { title }];
})();

const Notify = (() => {
    const effectFn = (dispatch, opts) => {
        if (Notification.permission === "granted") {
            new Notification(opts.message, { icon: faviconUrl });
        } else {
            alert(opts.message);
        }
    };
    return message => [effectFn, { message }]
})();

const Duration = Object.freeze({
    POMODORO_DURATION: 25 * 60 * 1000,
    SHORT_BREAK_DURATION: 5 * 60 * 1000,
    LONG_BREAK_DURATION: 15 * 60 * 1000
});
const Mode = Object.freeze({
    POMODORO_MODE: 0,
    SHORT_BREAK_MODE: 1,
    LONG_BREAK_MODE: 2
});
const Mode2Duration = Object.freeze({
    [Mode.POMODORO_MODE]: Duration.POMODORO_DURATION,
    [Mode.SHORT_BREAK_MODE]: Duration.SHORT_BREAK_DURATION,
    [Mode.LONG_BREAK_MODE]: Duration.LONG_BREAK_DURATION
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

const StartTimer = (state) => ([
    {
        ...state,
        timeRemaining: state.timeRemaining === 0 ? Mode2Duration[state.mode] : state.timeRemaining,
        lifecycle: Lifecycle.RUNNING_LIFECYCLE
    },
    RequestNotificationAccess(),
    UpdateTitle(formatTime(state.timeRemaining))
]);

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
        return [
            {
                ...state,
                lifecycle: Lifecycle.STOPPED_LIFECYCLE
            },
            Notify('Time is up!')
        ];
    }

    const newTimeRemaining = state.timeRemaining - OneSecond;
    return [
        {
            ...state,
            timeRemaining: newTimeRemaining
        },
        UpdateTitle(formatTime(newTimeRemaining))
    ];
};


app({
    init: { timeRemaining: Duration.POMODORO_DURATION, mode: Mode.POMODORO_MODE, lifecycle: Lifecycle.STOPPED_LIFECYCLE },
    view: ({ timeRemaining, mode, lifecycle }) => html`
        <main>
            <div>
                <div class="btn-group btn-group-toggle mb-3">
                    <button class="btn ${mode === Mode.POMODORO_MODE ? 'btn-primary' : 'btn-outline-primary'}" onclick=${ChangeModeToPomodoro}>
                        Pomodoro
                    </button>
                    <button class="btn ${mode === Mode.SHORT_BREAK_MODE ? 'btn-primary' : 'btn-outline-primary'}" onclick=${ChangeModeToShortBreak}>
                        Short break
                    </button>
                    <button class="btn ${mode === Mode.LONG_BREAK_MODE ? 'btn-primary' : 'btn-outline-primary'}" onclick=${ChangeModeToLongBreak}>
                        Long break
                    </button>
                </div>
            </div>
            <div>
                <div class="btn-group btn-group-toggle mb-3">
                    <button class="btn ${lifecycle === Lifecycle.RUNNING_LIFECYCLE ? 'btn-info' : 'btn-outline-info'}" onclick=${StartTimer}>
                        Start
                    </button>
                    <button class="btn ${lifecycle === Lifecycle.PAUSED_LIFECYCLE ? 'btn-info' : 'btn-outline-info'}" onclick=${PauseTimer}>
                        Pause
                    </button>
                    <button class="btn ${lifecycle === Lifecycle.STOPPED_LIFECYCLE ? 'btn-info' : 'btn-outline-info'}" onclick=${StopTimer}>
                        Stop
                    </button>
                </div>
            </div>
            <h1 class="display-3">${formatTime(timeRemaining)}</h1>
            <p class="text-muted small">
                Source code is available at${' '}<a href="https://github.com/zbicin/hyperdoro">GitHub</a>.
                <br />
                Built with${' '}<a href="https://github.com/jorgebucaran/hyperapp">Hyperapp</a>.
            </p>
        </main>
    `,
    subscriptions: ({ lifecycle }) => [
        lifecycle === Lifecycle.RUNNING_LIFECYCLE && every(OneSecond, Tick)
    ],
    node: document.getElementById("app"),
})