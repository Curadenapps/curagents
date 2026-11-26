// Every room of the vertical slice, in route order.
import type { RoomDef } from '../../registry';
import { rooms as crown } from './crown';
import { rooms as gumline } from './gumline';
import { rooms as narrows } from './narrows';
import { rooms as sugar } from './sugar';
import { rooms as calculus } from './calculus';

export const ROOMS: RoomDef[] = [...crown, ...gumline, ...narrows, ...sugar, ...calculus];
