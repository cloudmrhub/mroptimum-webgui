import CmrTabs from '../../common/components/CmrTabs/CmrTabs';
import Home from '../home/Home';
import Setup from '../setup/Setup';
import Results from '../results/Results';
import './Main.scss';

const Main = (props: any) => {
    const tabData = [
        { id: 1, text: 'Home', children: <Home {...props}/>},
        { id: 2, text: 'Set up', children: <Setup {...props}/>},
        { id: 3, text: 'Results', children: <Results {...props}/>},
    ];
    return (
        <div className="container mt-4">
            <CmrTabs tabList={tabData}/>
        </div>
    );
};

export default Main;
