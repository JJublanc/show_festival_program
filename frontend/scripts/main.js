const calendarEl = document.getElementById('calendar');
const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    aspectRatio: 1.5, // Vous pouvez définir les options directement lors de la création de l'objet calendar
});

document.addEventListener('DOMContentLoaded', () => {
    calendar.render();
    axios.get('http://localhost:3000/api/shows')
        .then(response => {
            appendSwiperSlides(response.data);
        })
        .catch(error => {
            console.error('Erreur lors de la requête:', error);
        });
    initializeSwiper();
});

function appendSwiperSlides(data) {
    const swiperWrapper = document.querySelector('.swiper-wrapper');
    const slidesHTML = data.map(show => {
        const sessionHTML = show.sessions.map(session => `
            <label class="checkbox-container">
                <div>
                    <input type="checkbox" id="${show._id}_${session._id}">
                    ${session.date} ${session.time} ${session.location}
                </div>
            </label>
        `).join('');

        return `
            <div class="swiper-slide">
                <img src="${show.imageURL}">
                <h3>${show.title}</h3>
                ${sessionHTML}
            </div>
        `;
    }).join('');

    swiperWrapper.innerHTML = slidesHTML;

    data.forEach(show => {
        show.sessions.forEach(session => {
            const eventId = `${show._id}_${session._id}`;
            let event = {
                id: eventId,
                title: show.title,
                start: session.start,
                end: session.end,
                checked: false,
            };
            let stored_event = localStorage.getItem(eventId);
            if (!stored_event) {
                localStorage.setItem(eventId, JSON.stringify(event));
            } else {
                event = JSON.parse(stored_event);
                if (event.checked) {
                    calendar.addEvent(event);
                }
            }
            const checkbox = document.getElementById(eventId);
            checkbox.checked = event.checked;
            addEventListenerToCheckbox(checkbox, event);
        });
        adjustEventColors(calendar)
    });
}

function addEventListenerToCheckbox(checkbox, event) {
    checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
            calendar.addEvent(event);
            adjustEventColors(calendar);
            event.checked = true;
        } else {
            const existingEvent = calendar.getEventById(event.id);
            if (existingEvent) {
                existingEvent.remove();
                adjustEventColors(calendar);
                event.checked = false;
            }
        }
        localStorage.setItem(event.id, JSON.stringify(event));
    });
}

function adjustEventColors(calendar) {
    const events = calendar.getEvents();
    events.forEach(currentEvent => {
        currentEvent.setProp('backgroundColor', '');
        currentEvent.setProp('borderColor', '');
    });

    events.forEach((currentEvent, currentIndex) => {
        const currentStart = currentEvent.start;
        const currentEnd = currentEvent.end;

        events.forEach((otherEvent, otherIndex) => {
            if (currentIndex !== otherIndex) {
                const otherStart = otherEvent.start;
                const otherEnd = otherEvent.end;

                if (
                    (currentStart >= otherStart && currentStart < otherEnd) ||
                    (currentEnd > otherStart && currentEnd <= otherEnd)
                ) {
                    currentEvent.setProp('backgroundColor', 'red');
                    currentEvent.setProp('borderColor', 'red');
                }
            }
        });
    });
}

function initializeSwiper() {
    const swiper = new Swiper('.mySwiper', {
        slidesPerView: 3,
        centeredSlides: true,
        spaceBetween: 30,
        observer: true,
        pagination: {
            el: '.swiper-pagination',
            type: 'fraction',
        },
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
    });
}

const downloadButton = document.getElementById("download_program_button");
downloadButton.addEventListener("click", () => {
    const events = calendar.getEvents();
    const icsContent = generateICS(events);

    const blob = new Blob([icsContent], {type: "text/calendar"});
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "calendrier.ics";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
});

function generateICS(events) {
    let icsContent = "BEGIN:VCALENDAR\r\n";
    events.forEach(event => {
        icsContent += "BEGIN:VEVENT\r\n";
        icsContent += `SUMMARY:${event.title}\r\n`;
        icsContent += `DTSTART:${event.start.toISOString().replace(/[-:]/g, "")}\r\n`;
        icsContent += `DTEND:${event.end.toISOString().replace(/[-:]/g, "")}\r\n`;
        icsContent += "END:VEVENT\r\n";
    });
    icsContent += "END:VCALENDAR\r\n";

    return icsContent;
}