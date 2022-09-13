# 虚拟滚动

- order: 13

使用 `useVirtual` 开启虚拟滚动，`scrollToRow` 滚动到指定行

:::lang=en-us
# Virtual scroll

- order: 13

Use `useVirtual` to enable virtual scrolling and `scrollToRow` scrolls to the specified column
:::

---

````jsx
import { Table } from '@alifd/next';
import {debounce, cloneDeep} from 'lodash';

const dataSource = (j, k = 2000) => {
  const result = [];
  for (let i = 0; i < j; i++) {
    result.push({
      title: {
        name: `Quotation for 1PCS Nano ${3 + i}.0 controller compatible`,
      },
      id: `100306660940${i}`,
      time: k + i,
      index: i,
    });
  }
  return result;
};
const render = (value, index, record) => {
  return <a>Remove({record.id})</a>;
};
const rowHeightFunc = (_, i) => {
  return 100 + i * 10 + 41;
};
class Comp extends React.Component {
    render() {
        return <div style={{ height: 100 + this.props.index * 10, overflow: "hidden" }}><Table columns={[{dataKey:1, title: "1"}]}/></div>
    }
}

const expandedRowRender = (_, i) => {
  return <Comp index={i} />;
};

class App extends React.Component {
  state = {
    scrollToRow: 20,
    data: dataSource(200),
    openRowKeys: new Array(200).fill(0).map((_, i) => `100306660940${i}`),
    bodyHeight: 0,
  };
  onBodyScroll = (start) => {
    this.setState({
      scrollToRow: start,
    });
  };

  componentDidMount() {
    // setTimeout(() => {
    // //   this.setState({ scrollToRow: 50 });
    // this.setState({data: dataSource(200, 99999)});
    // }, 3000);
  }
  render() {
    return (
      <Table
        dataSource={this.state.data}
        maxBodyHeight={400}
        useVirtual
        stickyHeader
        threshold={3}
        scrollToRow={this.state.scrollToRow}
        onRowOpen={(r) => {this.setState({openRowKeys: r})}}
        onBodyScroll={debounce(this.onBodyScroll, 200)}
        openRowKeys={this.state.openRowKeys}
        expandedRowRender={expandedRowRender}
        rowHeight={rowHeightFunc}
      >
        <Table.Column title="Id1" dataIndex="id" width={100} />
        <Table.Column title="Index" dataIndex="index" width={200} />
        <Table.Column title="Time" dataIndex="time" width={200} />
      </Table>
    );
  }
}

ReactDOM.render(<App/>, mountNode);
````
