import axios from 'axios';
import Swiper from 'swiper/bundle';
import 'swiper/css/bundle';

import * as process from "process";

import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list'


const calendarEl = document.getElementById('calendar');
const calendar = new Calendar(calendarEl, {
    plugins: [ dayGridPlugin, timeGridPlugin, listPlugin ],
    initialView: 'dayGridMonth',
aspectRatio: 1.5,
});

let festivals_items = [];
const backendUrl= process.env.BACKEND_URL

console.log(backendUrl + "/festivals");
document.addEventListener('DOMContentLoaded', () => {
    initializeSwiper();
    fetchFestivals().then(() => {
        let festivalName = document.getElementById('festival_selector').value;
        fetchShows(festivalName);
        console.log(festivals_items);
        let initial_date = festivals_items.filter(item => item.name === festivalName).map(item => item.start)[0];
        calendar.gotoDate(initial_date);
        calendar.render();
        console.log("Hello")
    });
});


function fetchFestivals() {
    return axios.get(backendUrl + '/festivals')
        .then(response => {
            festivals_items = response.data;
            console.log(festivals_items);
            appendFestivalList(response.data);
        })
        .catch(error => {
            console.error('Erreur lors de la requête:', error);
        });
}

function appendFestivalList(data) {
    const select = document.getElementById('festival_selector');
    const lisHTML = data.map(festival => {
        return `
            <option value=` + festival.name + `>` + festival.name + `</option>`
            ;
    }).join('');
    select.innerHTML = lisHTML;
    select.addEventListener('change', () => {
        fetchShows(select.value);
        let initial_date = festivals_items.filter(item => item.name === select.value).map(item => item.start)[0];
        calendar.gotoDate(initial_date);
    });
}

function fetchShows(festivalName, searchTerm) {
    let url = backendUrl + '/shows?festival=' + festivalName;
    if (searchTerm && searchTerm.trim() !== '') {
        url += '&term=' + encodeURIComponent(searchTerm);
    }

    return axios.get(url)
        .then(response => {
            appendSwiperSlides(response.data);
        })
        .catch(error => {
            console.error('Erreur lors de la requête:', error);
        });
}

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
            <div class="swiper-slide" id=` + show._id + `>
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

async function initializeSwiper() {
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
        }
    });
    swiper.on('slideChange', async function () {
        // This will be triggered every time the slide changes
        const activeIndex = this.realIndex;
        const activeSlideElement = this.slides[activeIndex];
        const show_id = activeSlideElement.id;
        const div = document.getElementById("show_description");

        // Then we display the content
        try {
            const description = await get_show_description(show_id);
            div.innerHTML = description;
        } catch (error) {
            console.error('Erreur lors de la requête:', error);
        }
    });
}

function get_show_description(show_id) {
    return axios.get(backendUrl + '/shows/' + show_id)
        .then(response => {
            return response.data.description;
        })
        .catch(error => {
            console.error('Erreur lors de la requête:', error);
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

document.getElementById('searchInput').addEventListener('input', function() {
    const searchTerm = this.value;
    let festivalName = document.getElementById('festival_selector').value;
    fetchShows(festivalName, searchTerm);
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