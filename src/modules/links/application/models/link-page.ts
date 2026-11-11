import { Link } from '../../domain/entities/link.entity';

export interface LinkPage {
  items: Link[];
  page: number;
  limit: number;
  total: number;
}
