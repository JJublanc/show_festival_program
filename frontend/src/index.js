import Swiper from 'swiper/bundle';
import 'swiper/css/bundle';
import './style/style.css';

import {Calendar} from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';

import festivalsData from './data/festivals.json';


const calendarEl = document.getElementById('calendar');
const calendar = new Calendar(calendarEl, {
    plugins: [dayGridPlugin, timeGridPlugin, listPlugin],
    initialView: 'dayGridMonth',
    aspectRatio: 1.5,
    eventClick: (info) => {
        info.jsEvent.preventDefault();
        const showId = String(info.event.id).split('_')[0];
        focusShowInSwiper(showId);
    },
});

function formatDuration(raw) {
    if (raw === undefined || raw === null || raw === '') return '';
    const total = typeof raw === 'number' ? raw : parseInt(raw, 10);
    if (!Number.isFinite(total) || total <= 0) return '';
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h && m) return `${h}h${String(m).padStart(2, '0')}`;
    if (h) return `${h}h`;
    return `${m}mn`;
}

function focusShowInSwiper(showId) {
    if (!swiper || !swiper.slides) return;
    const index = Array.from(swiper.slides).findIndex(s => s.id === showId);
    if (index >= 0) {
        swiper.slideTo(index);
    } else {
        loadDescription(showId);
    }
}

let festivals_items = [];
let allShows = [];
let currentPreviewShowId = null;
let swiper = null;
const PREVIEW_COLOR = '#8AB6D6';
const filtersState = {
    dateFrom: '',
    dateTo: '',
    weekdays: new Set(),
    timeFrom: '',
    timeTo: '',
    tags: new Set(),
    searchTerm: '',
};

document.addEventListener('DOMContentLoaded', () => {
    setupFiltersUI();
    loadFestivals();
    const festivalName = document.getElementById('festival_selector').value;
    if (festivalName) {
        loadShowsForFestival(festivalName);
        const initialDate = festivals_items.find(item => item.name === festivalName)?.start;
        if (initialDate) calendar.gotoDate(initialDate);
    }
    calendar.render();
});

function loadFestivals() {
    festivals_items = (festivalsData || []).slice();
    appendFestivalList(festivals_items);
}

function appendFestivalList(data) {
    const sortedData = data.sort((a, b) => new Date(b.start) - new Date(a.start));
    const select = document.getElementById('festival_selector');
    const lisHTML = sortedData.map(festival => {
        return `
            <option value=` + festival.name + `>` + festival.name + `</option>`
            ;
    }).join('');
    select.innerHTML = lisHTML;
    select.addEventListener('change', () => {
        loadShowsForFestival(select.value);
        const initialDate = festivals_items.find(item => item.name === select.value)?.start;
        if (initialDate) calendar.gotoDate(initialDate);
    });
}

function loadShowsForFestival(festivalName) {
    return import(
        /* webpackChunkName: "festival-data-[request]" */
        /* webpackMode: "lazy" */
        `./data/${festivalName}.json`
    )
        .then(module => {
            allShows = module.default || [];
            rebuildTagFilters();
            renderFilteredShows();
        })
        .catch(error => {
            console.error(`Aucune donnée pour ${festivalName}:`, error);
            allShows = [];
            rebuildTagFilters();
            renderFilteredShows();
        });
}

function rebuildTagFilters() {
    const row = document.getElementById('filter_tags_row');
    if (!row) return;
    const allTags = new Set();
    allShows.forEach(s => (s.tags || []).forEach(t => allTags.add(t)));
    const sorted = Array.from(allTags).sort((a, b) => a.localeCompare(b, 'fr'));
    filtersState.tags.forEach(t => { if (!allTags.has(t)) filtersState.tags.delete(t); });
    row.innerHTML = sorted.map(t => {
        const safe = t.replace(/"/g, '&quot;');
        const checked = filtersState.tags.has(t) ? 'checked' : '';
        return `<label class="wd"><input type="checkbox" data-tag="${safe}" ${checked}> ${t}</label>`;
    }).join('');
    row.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
            const t = cb.dataset.tag;
            if (cb.checked) filtersState.tags.add(t); else filtersState.tags.delete(t);
            renderFilteredShows();
        });
    });
}

window.loadDescription = async function(show_id) {
    const div = document.getElementById("show_description");
    try {
        const show = await get_show_description(show_id);
        const toHtml = (txt) => (txt || '').replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
        const chips = [];
        (show.tags || []).forEach(t => chips.push(`<span class="tag tag-category">${t}</span>`));
        if (show.country) chips.push(`<span class="tag tag-country">${show.country}</span>`);
        const durLabel = formatDuration(show.duration);
        if (durLabel) chips.push(`<span class="tag tag-duration">${durLabel}</span>`);
        const tagsHtml = chips.length ? `<div class="tag-list">${chips.join('')}</div>` : '';
        const linkHtml = show.officialUrl
            ? `<div class="show-link"><a href="${show.officialUrl}" target="_blank" rel="noopener noreferrer">Voir la fiche officielle ↗</a></div>`
            : '';
        const descHtml = show.description
            ? `<div class="show-desc">${toHtml(show.description)}</div>`
            : '';
        const extraHtml = show.descriptionExtra
            ? `<div class="show-extra"><em>Commentaire de la programmation :</em><br>${toHtml(show.descriptionExtra)}</div>`
            : '';
        div.innerHTML = `<h2 class="show-title">${show.title}</h2>${tagsHtml}${linkHtml}${descHtml}${extraHtml}`;
        setActivePreview(show);
    } catch (error) {
        console.error('Erreur lors de la requête:', error);
    }
}

function renderFilteredShows() {
    const filtered = allShows
        .filter(showMatchesTagFilter)
        .filter(showMatchesSearchTerm)
        .map(show => ({
            ...show,
            sessions: show.sessions.filter(sessionMatchesFilters),
        }))
        .filter(show => show.sessions.length > 0);

    appendSwiperSlides(filtered);

    if (filtered.length === 0) {
        document.getElementById("show_description").innerHTML = '';
        clearPreviewEvents();
        currentPreviewShowId = null;
        return;
    }
    const stillVisible = currentPreviewShowId && filtered.some(s => s._id === currentPreviewShowId);
    if (!stillVisible) {
        loadDescription(filtered[0]._id);
    }
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

    initializeSwiper();

    data.forEach(show => {
        const slideElement = document.getElementById(show._id);
        slideElement.addEventListener('click', () => loadDescription(show._id));
    });

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
                    const existingEvent = calendar.getEventById(eventId);
                    if (!existingEvent) {
                        calendar.addEvent(event);
                    }
                }
            }
            const checkbox = document.getElementById(eventId);
            checkbox.checked = event.checked;
            addEventListenerToCheckbox(checkbox, event);
        });
    });
    adjustEventColors(calendar);
}

function addEventListenerToCheckbox(checkbox, event) {
    checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
            const existingEvent = calendar.getEventById(event.id);
            if (existingEvent) {
                // Etait un preview -> le convertir en selection
                existingEvent.setExtendedProp('preview', false);
            } else {
                calendar.addEvent({
                    id: event.id,
                    title: event.title,
                    start: event.start,
                    end: event.end,
                });
            }
            adjustEventColors(calendar);
            event.checked = true;
        } else {
            const existingEvent = calendar.getEventById(event.id);
            if (existingEvent) {
                existingEvent.remove();
                adjustEventColors(calendar);
            }
            event.checked = false;
        }
        localStorage.setItem(event.id, JSON.stringify(event));
    });
}

function adjustEventColors(calendar) {
    const events = calendar.getEvents();
    events.forEach(currentEvent => {
        if (currentEvent.extendedProps.preview) {
            currentEvent.setProp('backgroundColor', PREVIEW_COLOR);
            currentEvent.setProp('borderColor', PREVIEW_COLOR);
        } else {
            currentEvent.setProp('backgroundColor', '');
            currentEvent.setProp('borderColor', '');
        }
    });

    const selected = events.filter(e => !e.extendedProps.preview);
    selected.forEach((currentEvent, currentIndex) => {
        const currentStart = currentEvent.start;
        const currentEnd = currentEvent.end;

        selected.forEach((otherEvent, otherIndex) => {
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

function clearPreviewEvents() {
    calendar.getEvents().forEach(evt => {
        if (evt.extendedProps.preview) {
            evt.remove();
        }
    });
}

function setActivePreview(show) {
    if (currentPreviewShowId === show._id) return;
    clearPreviewEvents();
    currentPreviewShowId = show._id;
    (show.sessions || []).forEach(session => {
        const eventId = `${show._id}_${session._id}`;
        if (calendar.getEventById(eventId)) return; // deja selectionne
        calendar.addEvent({
            id: eventId,
            title: show.title,
            start: session.start,
            end: session.end,
            extendedProps: {preview: true},
            backgroundColor: PREVIEW_COLOR,
            borderColor: PREVIEW_COLOR,
        });
    });
    adjustEventColors(calendar);
}

function initializeSwiper() {
    if (swiper) {
        swiper.destroy(true, true);
        swiper = null;
    }
    swiper = new Swiper('.mySwiper', {
        slidesPerView: 1,
        centeredSlides: true,
        spaceBetween: 16,
        slideToClickedSlide: true,
        watchOverflow: true,
        roundLengths: true,
        normalizeSlideIndex: true,
        breakpoints: {
            480: { slidesPerView: 2, spaceBetween: 18 },
            768: { slidesPerView: 3, spaceBetween: 22 },
            1024: { slidesPerView: 5, spaceBetween: 30 },
        },
        keyboard: {
            enabled: true,
            onlyInViewport: true,
        },
        pagination: {
            el: '.swiper-pagination',
            type: 'fraction',
        },
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
        preloadImages: false,
        lazy: true,
        on: {
            slideChange: (sw) => {
                const active = sw.slides[sw.activeIndex];
                if (active && active.id) {
                    loadDescription(active.id);
                }
            },
        },
    });
}

function get_show_description(show_id) {
    return Promise.resolve(allShows.find(s => s._id === show_id) || null);
}

const downloadButton = document.getElementById("download_program_button");
downloadButton.addEventListener("click", () => {
    const events = calendar.getEvents().filter(e => !e.extendedProps.preview);
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

document.getElementById('searchInput').addEventListener('input', function () {
    filtersState.searchTerm = this.value || '';
    renderFilteredShows();
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

// -------- Filtres date/jour/heure --------
function setupFiltersUI() {
    const container = document.getElementById('filters');
    if (!container) return;
    const searchContainer = container.querySelector('.search-container');
    if (searchContainer) {
        searchContainer.insertAdjacentHTML('beforeend', `
            <button type="button" id="filter_toggle">Filtres</button>
        `);
    }

    document.body.insertAdjacentHTML('beforeend', `
        <div class="modal-overlay" id="filter_modal" hidden>
            <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="filter_modal_title">
                <div class="modal-header">
                    <h3 id="filter_modal_title">Filtres de séances</h3>
                    <button type="button" class="modal-close" id="filter_modal_close" aria-label="Fermer">×</button>
                </div>
                <div class="filter-row">
                    <label>Du <input type="date" id="filter_date_from"></label>
                    <label>Au <input type="date" id="filter_date_to"></label>
                </div>
                <div class="filter-row">
                    <label>De <input type="time" id="filter_time_from"></label>
                    <label>À <input type="time" id="filter_time_to"></label>
                </div>
                <div class="filter-row weekdays">
                    ${['Lu','Ma','Me','Je','Ve','Sa','Di'].map((lbl, i) => {
                        const jsDay = i === 6 ? 0 : i + 1;
                        return `<label class="wd"><input type="checkbox" data-day="${jsDay}"> ${lbl}</label>`;
                    }).join('')}
                </div>
                <div class="filter-row tags" id="filter_tags_row"></div>
                <div class="filter-row" style="justify-content: flex-end;">
                    <button type="button" id="filter_reset">Réinitialiser</button>
                </div>
            </div>
        </div>
    `);

    const modal = document.getElementById('filter_modal');
    const openBtn = document.getElementById('filter_toggle');
    const closeBtn = document.getElementById('filter_modal_close');
    const openModal = () => modal.removeAttribute('hidden');
    const closeModal = () => modal.setAttribute('hidden', '');
    openBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    let renderTimer = null;
    const scheduleRender = () => {
        if (renderTimer) clearTimeout(renderTimer);
        renderTimer = setTimeout(() => { renderTimer = null; renderFilteredShows(); }, 150);
    };
    document.getElementById('filter_date_from').addEventListener('input', e => { filtersState.dateFrom = e.target.value; scheduleRender(); });
    document.getElementById('filter_date_to').addEventListener('input', e => { filtersState.dateTo = e.target.value; scheduleRender(); });
    document.getElementById('filter_time_from').addEventListener('input', e => { filtersState.timeFrom = e.target.value; scheduleRender(); });
    document.getElementById('filter_time_to').addEventListener('input', e => { filtersState.timeTo = e.target.value; scheduleRender(); });
    modal.querySelectorAll('.weekdays input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
            const d = Number(cb.dataset.day);
            if (cb.checked) filtersState.weekdays.add(d); else filtersState.weekdays.delete(d);
            renderFilteredShows();
        });
    });
    document.getElementById('filter_reset').addEventListener('click', () => {
        filtersState.dateFrom = '';
        filtersState.dateTo = '';
        filtersState.timeFrom = '';
        filtersState.timeTo = '';
        filtersState.weekdays.clear();
        filtersState.tags.clear();
        document.getElementById('filter_date_from').value = '';
        document.getElementById('filter_date_to').value = '';
        document.getElementById('filter_time_from').value = '';
        document.getElementById('filter_time_to').value = '';
        modal.querySelectorAll('.weekdays input[type="checkbox"]').forEach(cb => cb.checked = false);
        modal.querySelectorAll('.tags input[type="checkbox"]').forEach(cb => cb.checked = false);
        renderFilteredShows();
    });
}

function showMatchesTagFilter(show) {
    if (filtersState.tags.size === 0) return true;
    const showTags = show.tags || [];
    return showTags.some(t => filtersState.tags.has(t));
}

function showMatchesSearchTerm(show) {
    const term = (filtersState.searchTerm || '').trim().toLowerCase();
    if (!term) return true;
    return (show.title || '').toLowerCase().includes(term)
        || (show.description || '').toLowerCase().includes(term)
        || (show.descriptionExtra || '').toLowerCase().includes(term);
}

function sessionMatchesFilters(session) {
    const start = new Date(session.start);
    if (isNaN(start.getTime())) return true;

    if (filtersState.dateFrom) {
        const from = new Date(filtersState.dateFrom + 'T00:00:00');
        if (start < from) return false;
    }
    if (filtersState.dateTo) {
        const to = new Date(filtersState.dateTo + 'T23:59:59');
        if (start > to) return false;
    }
    if (filtersState.weekdays.size > 0) {
        if (!filtersState.weekdays.has(start.getDay())) return false;
    }
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    if (filtersState.timeFrom) {
        const [h, m] = filtersState.timeFrom.split(':').map(Number);
        if (startMinutes < h * 60 + m) return false;
    }
    if (filtersState.timeTo) {
        const [h, m] = filtersState.timeTo.split(':').map(Number);
        if (startMinutes > h * 60 + m) return false;
    }
    return true;
}
