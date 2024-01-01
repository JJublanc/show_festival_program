import data from "../data/etrange_festival_2022.json" assert {type: "json"};

var calendarEl = document.getElementById('calendar');
var calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth'
});

document.addEventListener('DOMContentLoaded', function () {
    calendar.render();
    calendar.setOption('aspectRatio', 1.5)
    append_swiper_slides(data)
    def_swiper();
});

function append_swiper_slides(data) {
    for (let i = 0; i < data.length; i++) {
        append_a_slide(data[i])
    }
}

function append_a_slide(show) {
    var swiper = document.querySelector('.swiper-wrapper');
    var swiper_slide = document.createElement('div');
    swiper_slide.classList.add('swiper-slide');
    let content =
        '<img src=' + show.ImageURL + '>' +
        '<h3>' + show.Title + '</h3>'
    for (let i = 0; i < show.Seances.length; i++) {
        let event_id = show.id + "_" + show.Seances[i].id
        content +=
            '<label class="checkbox-container">' +
            '<div>' +
            '<input type="checkbox" id=' + event_id + '>' +
            show.Seances[i].description +
            '</label>'
    }
    swiper_slide.innerHTML = content;
    swiper.appendChild(swiper_slide);
    for (let i = 0; i < show.Seances.length; i++) {
        let event_id = show.id + "_" + show.Seances[i].id
        let event = {
            id: event_id,
            title: show.Title, // Modify this to match your event data
            date: show.Seances[i].start, // Modify this to match the event start date
        };
        let checkbox = document.getElementById(event_id)
        add_event_listener(checkbox, event)
    }
}

function add_event_listener(checkbox, event) {
    checkbox.addEventListener('change', function () {
        if (this.checked) {
            // If the checkbox is checked, add the event to the calendar
            calendar.addEvent(event);
        } else {
            // If the checkbox is unchecked, remove the event from the calendar
            const existingEvent = calendar.getEventById(event.id);
            if (existingEvent) {
                existingEvent.remove();
            }
        }
    });
}


let download_program_button = document.getElementById('download_program_button')
download_program_button.addEventListener('click', download_program)
function def_swiper() {

    var swiper = new Swiper(".mySwiper", {
        slidesPerView: 3,
        centeredSlides: true,
        spaceBetween: 30,
        pagination: {
            el: ".swiper-pagination",
            type: "fraction",
        },
        navigation: {
            nextEl: ".swiper-button-next",
            prevEl: ".swiper-button-prev",
        },
    });
}