import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container } from '../layout/Container';
import { Button } from '../ui/Button';
import { StockistMap } from './StockistMap';
import { stockists } from '../../data/stockists';

export const StockistsTeaser: React.FC = () => {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(stockists.find((s) => s.kind === 'main')?.id ?? stockists[0].id);

  return (
    <section className="section-padding">
      <Container>
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="heading-with-stripe">Find BLOM Near You</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              From our home base in Randfontein to trusted distributors across Gauteng, the
              Free State and North West, BLOM is growing across South Africa.
            </p>
            <ul className="space-y-2 mb-6">
              {stockists.map((stockist) => (
                <li key={stockist.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(stockist.id)}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                      selectedId === stockist.id ? 'bg-pink-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        stockist.kind === 'main' ? 'bg-primary-pink' : 'bg-blue-400'
                      }`}
                    />
                    <span className="text-gray-700">
                      <span className="font-medium">{stockist.name}</span>
                      {' - '}
                      {stockist.town}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <Button onClick={() => navigate('/contact#stockists')}>View All Locations</Button>
          </div>
          <StockistMap heightClassName="h-72 md:h-96" selectedId={selectedId} onSelectId={setSelectedId} />
        </div>
      </Container>
    </section>
  );
};
