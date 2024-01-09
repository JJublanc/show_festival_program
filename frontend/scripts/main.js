var calendarEl = document.getElementById('calendar');
var calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth'
});

document.addEventListener('DOMContentLoaded', function () {
    calendar.render();
    calendar.setOption('aspectRatio', 1.5)
    axios.get('http://localhost:3000/api/shows')
        .then(response => {
            // Stockez les données de la réponse dans l'objet myData
            append_swiper_slides(response.data);
            // Vous pouvez maintenant accéder aux données via myData.data
        })
        .catch(error => {
            // Gérez les erreurs ici
            console.error('Erreur lors de la requête:', error);
        });
    def_swiper();
});

function append_swiper_slides(data) {
    for (let i = 0; i < data.length; i++) {
        append_a_slide(data[i]);
        console.log('Itération de la boucle :', i);
    }
}

function append_a_slide(show) {
    var swiper = document.querySelector('.swiper-wrapper');
    var swiper_slide = document.createElement('div');
    swiper_slide.classList.add('swiper-slide');
    let content =
        '<img src=' + show.imageURL + '>' +
        '<h3>' + show.title + '</h3>'
    for (let i = 0; i < show.sessions.length; i++) {
        let event_id = show._id + "_" + show.sessions[i]._id
        content +=
            '<label class="checkbox-container">' +
            '<div>' +
            '<input type="checkbox" id=' + event_id + '>' +
            show.sessions[i].date + " " + show.sessions[i].time + " " + show.sessions[i].location
            '</label>'
    }
    swiper_slide.innerHTML = content;
    swiper.appendChild(swiper_slide);
    for (let j = 0; j < show.sessions.length; j++) {
        let event_id = show._id + "_" + show.sessions[j]._id
        let event = {
            id: event_id,
            title: show.title, // Modify this to match your event data
            date: show.sessions[j].date, // Modify this to match the event start date
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


// let download_program_button = document.getElementById('download_program_button')
// download_program_button.addEventListener('click', download_program)
function def_swiper() {

    var swiper = new Swiper(".mySwiper", {
        slidesPerView: 3,
        centeredSlides: true,
        spaceBetween: 30,
        observer:true,
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