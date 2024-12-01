import { format } from 'date-fns';

function displayCurrentTime() {
    const currentTime = format(new Date(), 'HH:mm:ss');
    console.log(`Current Time: ${currentTime}`);
}

displayCurrentTime();

